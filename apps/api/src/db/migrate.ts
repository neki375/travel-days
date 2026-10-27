import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabase } from "./client";

export const MIGRATIONS_FOLDER = path.resolve(import.meta.dirname, "../../migrations");

export async function runMigrations(connectionString: string): Promise<void> {
  const { db, pool } = createDatabase(connectionString);
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await pool.end();
  }
}
