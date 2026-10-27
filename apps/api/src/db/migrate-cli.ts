import { runMigrations } from "./migrate";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

await runMigrations(connectionString);
console.log("Migrations applied");
