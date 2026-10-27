import { buildApp } from "./app";
import { loadEnv } from "./config/env";
import { createDatabase } from "./db/client";

const env = loadEnv(process.env);
const { db, pool } = createDatabase(env.DATABASE_URL);

const app = buildApp({
  db,
  auth: {
    botToken: env.BOT_TOKEN,
    initDataMaxAgeSeconds: env.INIT_DATA_MAX_AGE_SECONDS,
  },
  logger: { level: env.LOG_LEVEL },
});

app.addHook("onClose", () => pool.end());

async function shutdown(signal: string) {
  app.log.info({ signal }, "shutting down");
  await app.close();
  process.exit(0);
}

process.once("SIGINT", (signal) => void shutdown(signal));
process.once("SIGTERM", (signal) => void shutdown(signal));

await app.listen({ host: env.HOST, port: env.PORT });
