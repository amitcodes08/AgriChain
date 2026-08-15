import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),

  mongoUri: required("MONGO_URI", "mongodb://127.0.0.1:27017/agrichain"),

  aiServiceUrl: required("AI_SERVICE_URL", "http://127.0.0.1:8000"),
  aiRequestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 15_000),

  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  /**
   * Chain settings. When CONTRACT_ADDRESS and BACKEND_PRIVATE_KEY are both set the
   * API mirrors writes on chain; otherwise it runs in off-chain-only mode and every
   * response carries `chain: { enabled: false }` so the UI can degrade gracefully.
   */
  chain: {
    rpcUrl: process.env.RPC_URL ?? "http://127.0.0.1:8545",
    contractAddress: process.env.CONTRACT_ADDRESS ?? "",
    privateKey: process.env.BACKEND_PRIVATE_KEY ?? "",
    chainId: Number(process.env.CHAIN_ID ?? 31337),
    get enabled(): boolean {
      return Boolean(this.contractAddress && this.privateKey);
    },
  },

  uploadMaxBytes: Number(process.env.UPLOAD_MAX_BYTES ?? 8 * 1024 * 1024),
  logLevel: process.env.LOG_LEVEL ?? "info",
} as const;

export const isProduction = env.nodeEnv === "production";
