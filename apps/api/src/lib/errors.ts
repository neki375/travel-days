import type { ApiErrorBody, ErrorCode } from "@travel-days/shared";

/** An expected error with a known API code and HTTP status. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details: unknown;

  constructor(code: ErrorCode, statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function validationError(message: string, details?: unknown): AppError {
  return new AppError("VALIDATION_ERROR", 400, message, details);
}

export function unauthorized(): AppError {
  return new AppError("UNAUTHORIZED", 401, "Telegram authorization is missing or invalid");
}

export function errorBody(code: ErrorCode, message: string, details?: unknown): ApiErrorBody {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}
