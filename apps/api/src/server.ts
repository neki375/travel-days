import { buildApp } from "./app";
import { loadEnv } from "./config/env";

const env = loadEnv(process.env);
const app = buildApp({ logger: { level: env.LOG_LEVEL } });

async function shutdown(signal: string) {
  app.log.info({ signal }, "shutting down");
  await app.close();
  process.exit(0);
}

process.once("SIGINT", (signal) => void shutdown(signal));
process.once("SIGTERM", (signal) => void shutdown(signal));

await app.listen({ host: env.HOST, port: env.PORT });
