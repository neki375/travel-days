import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client";
import type { Clock } from "../lib/clock";
import { unauthorized } from "../lib/errors";
import { validateInitData } from "../lib/telegram-init-data";
import { findOrCreateUserByTelegramId, type UserRecord } from "../modules/users/users.repository";

declare module "fastify" {
  interface FastifyRequest {
    /** Authenticated user; set by the auth hook for every route in the protected scope. */
    authUser: UserRecord;
  }
}

export interface AuthOptions {
  db: Database;
  botToken: string;
  initDataMaxAgeSeconds: number;
  clock: Clock;
}

const AUTHORIZATION_PATTERN = /^tma\s+(\S+)$/i;

/** Requires `Authorization: tma <initData>` on every route of the given scope. */
export function registerAuth(scope: FastifyInstance, options: AuthOptions): void {
  scope.decorateRequest("authUser", null as unknown as UserRecord);

  scope.addHook("onRequest", async (request) => {
    const initData = AUTHORIZATION_PATTERN.exec(request.headers.authorization ?? "")?.[1];
    if (!initData) {
      throw unauthorized();
    }

    const result = validateInitData(initData, {
      botToken: options.botToken,
      maxAgeSeconds: options.initDataMaxAgeSeconds,
      now: options.clock.now(),
    });
    if (!result.ok) {
      request.log.info({ reason: result.reason }, "initData rejected");
      throw unauthorized();
    }

    request.authUser = await findOrCreateUserByTelegramId(options.db, result.data.telegramId);
  });
}
