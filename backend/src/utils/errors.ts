/** Errors that carry an intended HTTP status; anything else becomes a 500. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string = "APP_ERROR",
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace?.(this, AppError);
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, message, "BAD_REQUEST", details);

export const notFound = (message: string) => new AppError(404, message, "NOT_FOUND");

export const conflict = (message: string, details?: unknown) =>
  new AppError(409, message, "CONFLICT", details);

export const upstreamFailure = (message: string, details?: unknown) =>
  new AppError(502, message, "UPSTREAM_FAILURE", details);
