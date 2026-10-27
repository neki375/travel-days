import Fastify, { type FastifyServerOptions } from "fastify";
import type { Database } from "./db/client";
import { systemClock, type Clock } from "./lib/clock";
import { countriesRoutes } from "./modules/countries/countries.routes";
import { tripsRoutes } from "./modules/trips/trips.routes";
import { createTripsService } from "./modules/trips/trips.service";
import { registerAuth } from "./plugins/auth";
import { registerErrorHandlers } from "./plugins/error-handler";
import { registerTimeZone } from "./plugins/time-zone";

export interface AppDependencies {
  db: Database;
  auth: {
    botToken: string;
    initDataMaxAgeSeconds: number;
  };
  clock?: Clock;
  logger?: FastifyServerOptions["logger"];
}

export function buildApp({ db, auth, clock = systemClock, logger = false }: AppDependencies) {
  const app = Fastify({ logger });

  registerErrorHandlers(app);

  app.get("/health", () => ({ status: "ok" }));

  const tripsService = createTripsService(db);

  void app.register(
    async (api) => {
      registerAuth(api, { db, clock, ...auth });
      registerTimeZone(api);
      await api.register(countriesRoutes, { db });
      await api.register(tripsRoutes, { tripsService, clock });
    },
    { prefix: "/api/v1" },
  );

  return app;
}
