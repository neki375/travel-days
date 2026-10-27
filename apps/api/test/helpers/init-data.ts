import { buildDataCheckString, computeInitDataHash } from "../../src/lib/telegram-init-data";

export const TEST_BOT_TOKEN = "123456:TEST-token";

/** Fixed "now" of integration tests: 2026-10-27 in UTC, already 2026-10-28 in UTC+14. */
export const TEST_NOW = new Date("2026-10-27T12:00:00Z");

export interface SignInitDataOptions {
  telegramId?: number;
  authDate?: Date;
  botToken?: string;
  /** Extra or overriding raw fields; `undefined` removes a field. */
  fields?: Record<string, string | undefined>;
}

/** Builds initData signed the way Telegram signs it. */
export function signInitData(options: SignInitDataOptions = {}): string {
  const authDate = options.authDate ?? TEST_NOW;
  const fields = new Map<string, string>();

  const defaults: Record<string, string | undefined> = {
    query_id: "AAHtest",
    user: JSON.stringify({ id: options.telegramId ?? 1001, first_name: "Test" }),
    auth_date: String(Math.floor(authDate.getTime() / 1000)),
    ...options.fields,
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (value !== undefined) {
      fields.set(key, value);
    }
  }

  const hash = computeInitDataHash(
    buildDataCheckString(fields),
    options.botToken ?? TEST_BOT_TOKEN,
  );
  const params = new URLSearchParams([...fields, ["hash", hash]]);
  return params.toString();
}
