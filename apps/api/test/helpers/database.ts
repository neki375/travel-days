import { createDatabase } from "../../src/db/client";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://travel_days:travel_days@localhost:5433/travel_days_test";

/** Guards destructive helpers from running against a non-test database. */
export function assertTestDatabase(connectionString: string): void {
  const name = new URL(connectionString).pathname.slice(1);
  if (!name.endsWith("_test")) {
    throw new Error(`Refusing to use database "${name}" in tests: name must end with "_test"`);
  }
}

export function createTestDatabase() {
  assertTestDatabase(TEST_DATABASE_URL);
  return createDatabase(TEST_DATABASE_URL);
}

/** Removes user data; the countries reference table is kept. */
export async function resetUserData(pool: ReturnType<typeof createDatabase>["pool"]) {
  await pool.query("TRUNCATE users, trips CASCADE");
}
