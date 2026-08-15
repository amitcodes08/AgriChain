import { ethers, artifacts, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploys AgriSupplyChain and publishes the address + ABI to the places the rest
 * of the stack reads them from:
 *
 *   contracts/deployments/<network>.json   — canonical record
 *   backend/src/contracts/AgriSupplyChain.json
 *   frontend/lib/contracts/AgriSupplyChain.json
 *
 * Roles are granted to the AI verifier / distributor addresses from env so the
 * backend and AI service can act without extra manual steps.
 */
async function main() {
  const [deployer, farmer, verifier, distributor, buyer] = await ethers.getSigners();

  console.log(`\n🌱  Deploying AgriSupplyChain to "${network.name}"`);
  console.log(`    deployer: ${deployer.address}`);

  const factory = await ethers.getContractFactory("AgriSupplyChain");
  const contract = await factory.deploy(deployer.address);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`    ✅ deployed at ${address}`);

  // ---- role wiring -------------------------------------------------------
  const FARMER_ROLE = await contract.FARMER_ROLE();
  const AI_VERIFIER_ROLE = await contract.AI_VERIFIER_ROLE();
  const DISTRIBUTOR_ROLE = await contract.DISTRIBUTOR_ROLE();

  const verifierAddress = process.env.AI_VERIFIER_ADDRESS ?? verifier?.address;
  const distributorAddress = process.env.DISTRIBUTOR_ADDRESS ?? distributor?.address;
  const farmerAddress = process.env.FARMER_ADDRESS ?? farmer?.address;

  for (const [label, role, who] of [
    ["FARMER_ROLE", FARMER_ROLE, farmerAddress],
    ["AI_VERIFIER_ROLE", AI_VERIFIER_ROLE, verifierAddress],
    ["DISTRIBUTOR_ROLE", DISTRIBUTOR_ROLE, distributorAddress],
  ] as const) {
    if (!who) continue;
    const tx = await contract.grantRole(role, who);
    await tx.wait();
    console.log(`    🔑 ${label} → ${who}`);
  }

  // ---- publish artifacts -------------------------------------------------
  const { abi } = await artifacts.readArtifact("AgriSupplyChain");
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  const record = {
    contractName: "AgriSupplyChain",
    address,
    chainId,
    network: network.name,
    deployer: deployer.address,
    roles: {
      farmer: farmerAddress ?? null,
      aiVerifier: verifierAddress ?? null,
      distributor: distributorAddress ?? null,
      buyer: buyer?.address ?? null,
    },
    abi,
  };

  const targets = [
    path.resolve(__dirname, `../deployments/${network.name}.json`),
    path.resolve(__dirname, "../../backend/src/contracts/AgriSupplyChain.json"),
    path.resolve(__dirname, "../../frontend/lib/contracts/AgriSupplyChain.json"),
  ];

  for (const target of targets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(record, null, 2)}\n`);
    console.log(`    📦 wrote ${path.relative(process.cwd(), target)}`);
  }

  console.log(`\n    Add to backend/.env →  CONTRACT_ADDRESS=${address}`);
  console.log(`    Add to frontend/.env.local →  NEXT_PUBLIC_CONTRACT_ADDRESS=${address}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
