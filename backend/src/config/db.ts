import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "./logger";

mongoose.set("strictQuery", true);

/**
 * Connects to MongoDB with bounded retries. The API is useless without its
 * database, so a failure here is fatal rather than silently degraded.
 */
export async function connectDatabase(attempts = 10, delayMs = 3_000): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mongoose.connect(env.mongoUri, {
        serverSelectionTimeoutMS: 5_000,
        autoIndex: env.nodeEnv !== "production",
      });
      logger.info({ uri: redact(env.mongoUri) }, "MongoDB connected");
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn({ attempt, attempts, message }, "MongoDB connection failed, retrying");
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
  logger.info("MongoDB disconnected");
}

/** Strips credentials from a connection string before it reaches the logs. */
function redact(uri: string): string {
  return uri.replace(/\/\/([^@]+)@/, "//***@");
}
