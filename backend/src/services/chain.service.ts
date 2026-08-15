import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { statusToChainEnum, type BatchStatus } from "../domain/constants";

/**
 * Optional bridge to the AgriSupplyChain contract.
 *
 * The API is useful without a chain (demo mode, offline field kiosk), so every
 * method here degrades to a no-op when `env.chain.enabled` is false or the ABI
 * has not been published by the deploy script yet. Callers check the `enabled`
 * flag rather than catching exceptions.
 */

interface DeploymentRecord {
  address: string;
  chainId: number;
  abi: ethers.InterfaceAbi;
}

/**
 * Where the deploy script's output might be. Checked in order:
 *   1. CONTRACT_ABI_PATH        — explicit override (compose mounts the chain's
 *                                 deployments directory and points here)
 *   2. <dist|src>/contracts/    — written by contracts/scripts/deploy.ts
 *   3. ../src/contracts/        — running from dist/ without copying JSON
 *   4. ../../contracts/deployments/localhost.json — a sibling checkout
 */
const ABI_CANDIDATES = [
  process.env.CONTRACT_ABI_PATH,
  path.resolve(__dirname, "../contracts/AgriSupplyChain.json"),
  path.resolve(__dirname, "../../src/contracts/AgriSupplyChain.json"),
  path.resolve(process.cwd(), "src/contracts/AgriSupplyChain.json"),
  path.resolve(process.cwd(), "../contracts/deployments/localhost.json"),
].filter((candidate): candidate is string => Boolean(candidate));

let provider: ethers.JsonRpcProvider | null = null;
let contract: ethers.Contract | null = null;
let initialised = false;

function loadDeployment(): DeploymentRecord | null {
  for (const candidate of ABI_CANDIDATES) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const record = JSON.parse(fs.readFileSync(candidate, "utf8")) as DeploymentRecord;
      if (record?.abi) {
        logger.info({ path: candidate }, "Loaded contract ABI");
        return record;
      }
    } catch (error) {
      logger.warn({ err: error, path: candidate }, "Could not parse contract artifact");
    }
  }
  return null;
}

/** Lazily wires up provider + signer. Safe to call repeatedly. */
export function initChain(): void {
  if (initialised) return;
  initialised = true;

  if (!env.chain.enabled) {
    logger.info("Chain bridge disabled (set CONTRACT_ADDRESS and BACKEND_PRIVATE_KEY to enable)");
    return;
  }

  const deployment = loadDeployment();
  if (!deployment?.abi) {
    logger.warn(
      { searched: ABI_CANDIDATES },
      "Chain bridge configured but no ABI found — run the contract deploy script first",
    );
    return;
  }

  try {
    provider = new ethers.JsonRpcProvider(env.chain.rpcUrl, env.chain.chainId);
    const wallet = new ethers.Wallet(env.chain.privateKey, provider);
    contract = new ethers.Contract(env.chain.contractAddress, deployment.abi, wallet);
    logger.info(
      { address: env.chain.contractAddress, rpc: env.chain.rpcUrl, signer: wallet.address },
      "Chain bridge ready",
    );
  } catch (error) {
    logger.error({ err: error }, "Failed to initialise chain bridge");
    provider = null;
    contract = null;
  }
}

export function isChainEnabled(): boolean {
  initChain();
  return contract !== null;
}

export function chainStatus(): { enabled: boolean; address: string | null; chainId: number | null } {
  initChain();
  return {
    enabled: contract !== null,
    address: contract ? env.chain.contractAddress : null,
    chainId: contract ? env.chain.chainId : null,
  };
}

/** Wraps a chain call so a broken RPC never takes down an API request. */
async function attempt<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  if (!isChainEnabled()) return null;
  try {
    return await fn();
  } catch (error) {
    logger.warn({ err: error, label }, "Chain call failed — continuing off-chain");
    return null;
  }
}

export interface MintResult {
  tokenId: string;
  txHash: string;
}

/**
 * Mints the traceability NFT for a freshly registered batch.
 *
 * Prices are stored off-chain as decimal AGRI; on chain they are wei-denominated,
 * so we scale by 1e18 on the way in and back on the way out.
 */
export async function mintBatch(input: {
  farmerWallet: string;
  cropType: string;
  quantityKg: number;
  pricePerKg: number;
  metadataURI: string;
  dataHash: string;
  origin: string;
}): Promise<MintResult | null> {
  return attempt("registerBatch", async () => {
    const tx = await contract!.registerBatch(
      input.farmerWallet,
      input.cropType,
      BigInt(Math.round(input.quantityKg)),
      ethers.parseEther(input.pricePerKg.toFixed(18)),
      input.metadataURI,
      input.dataHash,
      input.origin,
    );
    const receipt = await tx.wait();

    // Prefer the event over totalBatches() — concurrent mints make the counter racy.
    const parsed = receipt.logs
      .map((log: ethers.Log) => {
        try {
          return contract!.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((entry: ethers.LogDescription | null) => entry?.name === "BatchRegistered");

    const tokenId = parsed?.args?.batchId?.toString() ?? (await contract!.totalBatches()).toString();
    return { tokenId, txHash: receipt.hash as string };
  });
}

/** Writes an AI attestation on chain. */
export async function recordQuality(
  tokenId: string,
  qualityScore: number,
  reportURI: string,
): Promise<string | null> {
  return attempt("recordQualityAssessment", async () => {
    const tx = await contract!.recordQualityAssessment(
      BigInt(tokenId),
      Math.round(qualityScore),
      reportURI,
    );
    const receipt = await tx.wait();
    return receipt.hash as string;
  });
}

/** Mirrors a lifecycle transition on chain. */
export async function pushStatus(
  tokenId: string,
  status: BatchStatus,
  location: string,
  note: string,
): Promise<string | null> {
  return attempt("updateStatus", async () => {
    const tx = await contract!.updateStatus(
      BigInt(tokenId),
      statusToChainEnum(status),
      location,
      note,
    );
    const receipt = await tx.wait();
    return receipt.hash as string;
  });
}

/** Lists a verified batch for sale at the given AGRI-per-kg price. */
export async function listOnMarket(tokenId: string, pricePerKg: number): Promise<string | null> {
  return attempt("listOnMarket", async () => {
    const tx = await contract!.listOnMarket(
      BigInt(tokenId),
      ethers.parseEther(pricePerKg.toFixed(18)),
    );
    const receipt = await tx.wait();
    return receipt.hash as string;
  });
}

export interface OnChainBatch {
  tokenId: string;
  farmer: string;
  cropType: string;
  quantityKg: string;
  pricePerKg: string;
  status: number;
  qualityScore: number;
  qualityVerified: boolean;
  dataHash: string;
  origin: string;
  owner: string;
  tokenURI: string;
}

/** Reads the canonical on-chain record for a batch. */
export async function readBatch(tokenId: string): Promise<OnChainBatch | null> {
  return attempt("getBatch", async () => {
    const batch = await contract!.getBatch(BigInt(tokenId));
    const [owner, tokenURI] = await Promise.all([
      contract!.ownerOf(BigInt(tokenId)),
      contract!.tokenURI(BigInt(tokenId)),
    ]);

    return {
      tokenId: batch.id.toString(),
      farmer: batch.farmer,
      cropType: batch.cropType,
      quantityKg: batch.quantityKg.toString(),
      pricePerKg: ethers.formatEther(batch.pricePerKg),
      status: Number(batch.status),
      qualityScore: Number(batch.qualityScore),
      qualityVerified: batch.qualityVerified,
      dataHash: batch.dataHash,
      origin: batch.origin,
      owner,
      tokenURI,
    };
  });
}

export interface OnChainEvent {
  status: number;
  actor: string;
  timestamp: number;
  location: string;
  note: string;
}

/** Reads the append-only provenance trail for a batch. */
export async function readHistory(tokenId: string): Promise<OnChainEvent[] | null> {
  return attempt("getHistory", async () => {
    const events = await contract!.getHistory(BigInt(tokenId));
    return events.map((event: OnChainEvent) => ({
      status: Number(event.status),
      actor: event.actor,
      timestamp: Number(event.timestamp),
      location: event.location,
      note: event.note,
    }));
  });
}

/** keccak256 of a metadata document — the pin stored alongside the token URI. */
export function hashMetadata(payload: unknown): string {
  return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(payload)));
}
