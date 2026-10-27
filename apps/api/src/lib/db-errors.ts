import pg from "pg";

export interface PgConstraintViolation {
  code: string;
  constraint: string | undefined;
}

/** Postgres error details of a failed query; Drizzle keeps the driver error as `cause`. */
export function getPgError(error: unknown): PgConstraintViolation | undefined {
  const candidate = error instanceof Error && error.cause !== undefined ? error.cause : error;

  if (candidate instanceof pg.DatabaseError && candidate.code !== undefined) {
    return { code: candidate.code, constraint: candidate.constraint };
  }
  return undefined;
}
