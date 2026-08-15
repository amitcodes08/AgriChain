import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY =
  process.env.DEPLOYER_PRIVATE_KEY ??
  // Default Hardhat account #0 — local development only, never for real funds.
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // OpenZeppelin 5.x uses the `mcopy` opcode, so the target must be Cancun or
      // later. Polygon has supported it since the Napoli upgrade.
      evmVersion: "cancun",
      viaIR: false,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      // Deterministic, well-funded accounts for the docker-compose dev chain.
      accounts: {
        mnemonic:
          process.env.DEV_MNEMONIC ??
          "test test test test test test test test test test test junk",
        count: 10,
        accountsBalance: "10000000000000000000000",
      },
    },
    localhost: {
      url: process.env.RPC_URL ?? "http://127.0.0.1:8545",
      chainId: 31337,
    },
    amoy: {
      url: process.env.AMOY_RPC_URL ?? "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: [PRIVATE_KEY],
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL ?? "https://polygon-rpc.com",
      chainId: 137,
      accounts: [PRIVATE_KEY],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: { timeout: 120_000 },
};

export default config;
