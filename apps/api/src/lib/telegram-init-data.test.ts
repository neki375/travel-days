import { describe, expect, it } from "vitest";
import { TEST_BOT_TOKEN, signInitData } from "../../test/helpers/init-data";
import { validateInitData } from "./telegram-init-data";

const now = new Date("2026-10-27T20:00:00Z");
const options = { botToken: TEST_BOT_TOKEN, maxAgeSeconds: 86_400, now };

function tamper(initData: string, key: string, value: string): string {
  const params = new URLSearchParams(initData);
  params.set(key, value);
  return params.toString();
}

describe("validateInitData", () => {
  it("accepts a reference vector computed independently with openssl", () => {
    const initData = new URLSearchParams([
      ["query_id", "AAH"],
      ["user", '{"id":42,"first_name":"Test"}'],
      ["auth_date", "1793131200"],
      ["hash", "95ae9134e98737e2010dadb510f0f67eab91094bb4ed2c4d223cd6b77450c359"],
    ]).toString();

    expect(validateInitData(initData, options)).toEqual({
      ok: true,
      data: { telegramId: 42, authDate: now },
    });
  });

  it("accepts correctly signed data and returns the telegram id", () => {
    const result = validateInitData(signInitData({ telegramId: 777, authDate: now }), options);

    expect(result).toEqual({ ok: true, data: { telegramId: 777, authDate: now } });
  });

  it("accepts fields that are not known to the server, such as signature", () => {
    const initData = signInitData({ authDate: now, fields: { signature: "abc", chat_type: "x" } });

    expect(validateInitData(initData, options).ok).toBe(true);
  });

  it("rejects a changed user", () => {
    const initData = tamper(signInitData({ authDate: now }), "user", '{"id":999}');

    expect(validateInitData(initData, options)).toEqual({ ok: false, reason: "INVALID_SIGNATURE" });
  });

  it("rejects a changed auth_date", () => {
    const initData = tamper(signInitData({ authDate: now }), "auth_date", "1793131300");

    expect(validateInitData(initData, options)).toEqual({ ok: false, reason: "INVALID_SIGNATURE" });
  });

  it("rejects an added field", () => {
    const initData = `${signInitData({ authDate: now })}&extra=1`;

    expect(validateInitData(initData, options)).toEqual({ ok: false, reason: "INVALID_SIGNATURE" });
  });

  it("rejects data signed with another bot token", () => {
    const initData = signInitData({ authDate: now, botToken: "654321:OTHER-token" });

    expect(validateInitData(initData, options)).toEqual({ ok: false, reason: "INVALID_SIGNATURE" });
  });

  it.each([
    ["empty hash", ""],
    ["short hash", "abcd"],
    ["non-hex hash", "z".repeat(64)],
  ])("rejects %s without throwing", (_name, hash) => {
    const initData = tamper(signInitData({ authDate: now }), "hash", hash);
    const result = validateInitData(initData, options);

    expect(result.ok).toBe(false);
  });

  it("rejects data without hash", () => {
    const params = new URLSearchParams(signInitData({ authDate: now }));
    params.delete("hash");

    expect(validateInitData(params.toString(), options)).toEqual({
      ok: false,
      reason: "MISSING_HASH",
    });
  });

  it.each(["", "garbage", "%%%"])("rejects malformed input %j", (initData) => {
    expect(validateInitData(initData, options).ok).toBe(false);
  });

  it("rejects duplicate keys", () => {
    const initData = signInitData({ authDate: now });
    const params = new URLSearchParams(initData);

    expect(validateInitData(`${initData}&user=${params.get("user")}`, options)).toEqual({
      ok: false,
      reason: "MALFORMED",
    });
  });

  it("rejects data older than the maximum age", () => {
    const authDate = new Date(now.getTime() - 86_401_000);

    expect(validateInitData(signInitData({ authDate }), options)).toEqual({
      ok: false,
      reason: "EXPIRED",
    });
  });

  it("accepts data exactly at the maximum age", () => {
    const authDate = new Date(now.getTime() - 86_400_000);

    expect(validateInitData(signInitData({ authDate }), options).ok).toBe(true);
  });

  it("tolerates small clock skew but rejects auth_date far in the future", () => {
    const slightlyAhead = new Date(now.getTime() + 30_000);
    const farAhead = new Date(now.getTime() + 3_600_000);

    expect(validateInitData(signInitData({ authDate: slightlyAhead }), options).ok).toBe(true);
    expect(validateInitData(signInitData({ authDate: farAhead }), options)).toEqual({
      ok: false,
      reason: "FROM_FUTURE",
    });
  });

  it("rejects signed data without auth_date", () => {
    const initData = signInitData({ authDate: now, fields: { auth_date: undefined } });

    expect(validateInitData(initData, options)).toEqual({ ok: false, reason: "MISSING_AUTH_DATE" });
  });

  it.each([
    ["missing", undefined],
    ["not JSON", "not-json"],
    ["without id", '{"first_name":"Test"}'],
    ["string id", '{"id":"42"}'],
    ["negative id", '{"id":-5}'],
    ["fractional id", '{"id":4.2}'],
  ])("rejects signed data with %s user", (_name, user) => {
    const initData = signInitData({ authDate: now, fields: { user } });

    expect(validateInitData(initData, options)).toEqual({ ok: false, reason: "MISSING_USER" });
  });
});
