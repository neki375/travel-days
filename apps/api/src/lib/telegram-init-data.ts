import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Validation of Telegram Mini App initData:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

/** Tolerated clock difference between Telegram and this server for auth_date in the future. */
const MAX_CLOCK_SKEW_SECONDS = 60;

export interface InitDataValidationOptions {
  botToken: string;
  maxAgeSeconds: number;
  now: Date;
}

export interface ValidatedInitData {
  telegramId: number;
  authDate: Date;
}

export type InitDataFailure =
  | "MALFORMED"
  | "MISSING_HASH"
  | "INVALID_SIGNATURE"
  | "MISSING_AUTH_DATE"
  | "EXPIRED"
  | "FROM_FUTURE"
  | "MISSING_USER";

export type InitDataResult =
  { ok: true; data: ValidatedInitData } | { ok: false; reason: InitDataFailure };

export function validateInitData(
  initData: string,
  options: InitDataValidationOptions,
): InitDataResult {
  const params = new URLSearchParams(initData);
  const fields = new Map<string, string>();

  for (const [key, value] of params) {
    // Duplicate keys make the signed payload ambiguous.
    if (fields.has(key)) {
      return { ok: false, reason: "MALFORMED" };
    }
    fields.set(key, value);
  }

  const hash = fields.get("hash");
  if (!hash) {
    return { ok: false, reason: "MISSING_HASH" };
  }
  fields.delete("hash");

  if (!signatureMatches(hash, buildDataCheckString(fields), options.botToken)) {
    return { ok: false, reason: "INVALID_SIGNATURE" };
  }

  const authDateSeconds = Number(fields.get("auth_date"));
  if (!Number.isSafeInteger(authDateSeconds) || authDateSeconds <= 0) {
    return { ok: false, reason: "MISSING_AUTH_DATE" };
  }

  const ageSeconds = options.now.getTime() / 1000 - authDateSeconds;
  if (ageSeconds > options.maxAgeSeconds) {
    return { ok: false, reason: "EXPIRED" };
  }
  if (ageSeconds < -MAX_CLOCK_SKEW_SECONDS) {
    return { ok: false, reason: "FROM_FUTURE" };
  }

  const telegramId = parseUserId(fields.get("user"));
  if (telegramId === null) {
    return { ok: false, reason: "MISSING_USER" };
  }

  return { ok: true, data: { telegramId, authDate: new Date(authDateSeconds * 1000) } };
}

/** All fields except hash, sorted by key, as key=value lines. */
export function buildDataCheckString(fields: ReadonlyMap<string, string>): string {
  return [...fields]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

export function computeInitDataHash(dataCheckString: string, botToken: string): string {
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  return createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
}

function signatureMatches(hash: string, dataCheckString: string, botToken: string): boolean {
  const expected = Buffer.from(computeInitDataHash(dataCheckString, botToken), "hex");
  const actual = Buffer.from(hash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function parseUserId(rawUser: string | undefined): number | null {
  if (rawUser === undefined) {
    return null;
  }

  try {
    const user: unknown = JSON.parse(rawUser);
    if (typeof user === "object" && user !== null && "id" in user) {
      const id = user.id;
      if (typeof id === "number" && Number.isSafeInteger(id) && id > 0) {
        return id;
      }
    }
  } catch {
    // Malformed JSON is treated as a missing user.
  }
  return null;
}
