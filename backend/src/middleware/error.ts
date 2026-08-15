import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";
import { logger } from "../config/logger";
import { isProduction } from "../config/env";

/** Wraps an async handler so rejected promises reach the error middleware. */
export const asyncHandler =
  <T extends RequestHandler>(handler: T): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.originalUrl}` },
  });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Some fields need another look.",
        details: error.issues.map((issue) => ({
          field: issue.path.join(".") || "(root)",
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  // Mongo duplicate key — surfaces as a conflict rather than a server fault.
  if (typeof error === "object" && error !== null && (error as { code?: number }).code === 11000) {
    res.status(409).json({
      success: false,
      error: { code: "DUPLICATE_KEY", message: "That record already exists." },
    });
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  logger.error({ err: error }, "Unhandled error");

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: isProduction ? "Something went wrong on our side." : message,
    },
  });
}
