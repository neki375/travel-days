import pg from "pg";
import { runMigrations } from "../src/db/migrate";
import { TEST_DATABASE_URL, assertTestDatabase } from "./helpers/database";

/** Recreates the test database schema from migrations once per test run. */
export default async function setup() {
  assertTestDatabase(TEST_DATABASE_URL);

  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await client.query("CREATE SCHEMA public");
  } finally {
    await client.end();
  }

  await runMigrations(TEST_DATABASE_URL);
}
