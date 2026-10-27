/** Error codes of the unified API error format (SPEC.md §4.8, §10.6). */
export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "TRIP_NOT_FOUND",
  "NOT_FOUND",
  "TRIP_ALREADY_CLOSED",
  "TRIP_OVERLAP",
  "OPEN_TRIP_EXISTS",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}
