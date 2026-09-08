import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express requires 4-arg signature to detect error middleware
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Validation failed",
      errors: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.status).json({ message: error.message });
    return;
  }

  // Handle PostgreSQL specific errors
  if (typeof error === "object" && error !== null && "code" in error) {
    const pgError = error as { code?: string; detail?: string; constraint?: string; message?: string };
    if (pgError.code === "23505") {
      res.status(409).json({
        message: pgError.detail || "A record with this unique identifier or name already exists.",
      });
      return;
    }
    if (pgError.code === "23503") {
      res.status(400).json({
        message: "Referenced record does not exist or cannot be deleted due to existing relationships.",
      });
      return;
    }
    if (pgError.code === "ECONNREFUSED") {
      res.status(503).json({
        message: "Database connection failed. Please ensure PostgreSQL is running and reachable at your DATABASE_URL.",
      });
      return;
    }
  }

  console.error(error);
  res.status(500).json({ message: "Internal server error" });
}
