import Fastify, { type FastifyServerOptions } from "fastify";

export interface BuildAppOptions {
  logger?: FastifyServerOptions["logger"];
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? false });

  app.get("/health", () => ({ status: "ok" }));

  return app;
}
