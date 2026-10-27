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

export function tripNotFound(): AppError {
  return new AppError("TRIP_NOT_FOUND", 404, "Trip not found");
}

export function tripAlreadyClosed(): AppError {
  return new AppError("TRIP_ALREADY_CLOSED", 409, "Trip is already closed");
}

export function openTripExists(): AppError {
  return new AppError("OPEN_TRIP_EXISTS", 409, "Another trip is still open");
}

export function tripOverlap(): AppError {
  return new AppError("TRIP_OVERLAP", 409, "Trip dates overlap with another trip");
}

export function errorBody(code: ErrorCode, message: string, details?: unknown): ApiErrorBody {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}
