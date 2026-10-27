import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

// Keep DATE values as YYYY-MM-DD strings. The default parser builds a Date at local
// midnight of the process time zone, which shifts the calendar day on serialization.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

export function createDatabase(connectionString: string) {
  const pool = new pg.Pool({ connectionString });
  const db = drizzle({ client: pool, schema });

  return { db, pool };
}

export type Database = ReturnType<typeof createDatabase>["db"];
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Anything that can run queries: the pool-backed database or an open transaction. */
export type DbExecutor = Database | Transaction;
