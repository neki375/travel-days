import { buildApp, type AppDependencies } from "../../src/app";
import type { Database } from "../../src/db/client";
import { TEST_BOT_TOKEN, TEST_NOW, signInitData, type SignInitDataOptions } from "./init-data";

export function createTestApp(db: Database, overrides: Partial<AppDependencies> = {}) {
  return buildApp({
    db,
    auth: { botToken: TEST_BOT_TOKEN, initDataMaxAgeSeconds: 86_400 },
    clock: { now: () => TEST_NOW },
    ...overrides,
  });
}

/** Headers of a request made from the Mini App by the given Telegram user. */
export function authHeaders(telegramId = 1001, options: SignInitDataOptions = {}) {
  return { authorization: `tma ${signInitData({ telegramId, ...options })}` };
}
