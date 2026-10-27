import type { z } from "zod";
import { validationError } from "./errors";

/** Parses untrusted input; failures become 400 VALIDATION_ERROR with per-field details. */
export function parseInput<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    throw validationError("Request validation failed", details);
  }

  return result.data;
}
