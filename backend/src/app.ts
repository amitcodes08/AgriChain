import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import mongoose from "mongoose";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { router } from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { chainStatus, initChain } from "./services/chain.service";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: (origin, callback) => {
        // Same-origin/curl requests have no Origin header and are always allowed.
        if (!origin || env.corsOrigins.includes(origin) || env.corsOrigins.includes("*")) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    }),
  );

  // Photos arrive as data URLs from the browser, so the JSON limit is generous.
  app.use(express.json({ limit: "12mb" }));
  app.use(express.urlencoded({ extended: true, limit: "12mb" }));

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === "/health" || req.url === "/api/health" },
    }),
  );

  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: {
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many requests — please slow down." },
      },
    }),
  );

  initChain();

  const health = (_req: express.Request, res: express.Response) => {
    const dbState = mongoose.connection.readyState;
    const dbUp = dbState === 1;
    res.status(dbUp ? 200 : 503).json({
      success: dbUp,
      service: "agrichain-backend",
      status: dbUp ? "ok" : "degraded",
      database: ["disconnected", "connected", "connecting", "disconnecting"][dbState] ?? "unknown",
      chain: chainStatus(),
      aiService: env.aiServiceUrl,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  };

  app.get("/health", health);
  app.get("/api/health", health);

  app.use("/api", router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
