import type { FastifyInstance, FastifyRequest } from "fastify";
import { DEFAULT_TIME_ZONE, isValidTimeZone, todayInTimeZone, type Clock } from "../lib/clock";

declare module "fastify" {
  interface FastifyRequest {
    /** IANA time zone from X-Timezone, or UTC when it is absent or invalid (SPEC.md §10.2). */
    timeZone: string;
  }
}

const MAX_TIME_ZONE_LENGTH = 64;

export function registerTimeZone(scope: FastifyInstance): void {
  scope.decorateRequest("timeZone", DEFAULT_TIME_ZONE);

  scope.addHook("onRequest", (request, _reply, done) => {
    const header = request.headers["x-timezone"];
    if (
      typeof header === "string" &&
      header.length <= MAX_TIME_ZONE_LENGTH &&
      isValidTimeZone(header)
    ) {
      request.timeZone = header;
    }
    done();
  });
}

/** The user's current calendar date, computed on the server. */
export function requestToday(request: FastifyRequest, clock: Clock): string {
  return todayInTimeZone(request.timeZone, clock.now());
}
