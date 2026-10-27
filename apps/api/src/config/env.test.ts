import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

const validEnv = {
  DATABASE_URL: "postgres://user:pass@localhost:5432/db",
  BOT_TOKEN: "123456:ABC-def_123",
};

describe("loadEnv", () => {
  it("applies defaults", () => {
    const env = loadEnv(validEnv);

    expect(env).toMatchObject({
      NODE_ENV: "development",
      PORT: 3000,
      INIT_DATA_MAX_AGE_SECONDS: 86_400,
    });
  });

  it("coerces numeric values", () => {
    expect(loadEnv({ ...validEnv, PORT: "8080" }).PORT).toBe(8080);
  });

  it("rejects a missing bot token", () => {
    expect(() => loadEnv({ DATABASE_URL: validEnv.DATABASE_URL })).toThrow(/BOT_TOKEN/);
  });

  it("rejects a non-postgres database url", () => {
    expect(() => loadEnv({ ...validEnv, DATABASE_URL: "mysql://localhost/db" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("does not echo secret values in the error", () => {
    const secret = "not-a-valid-token";

    expect(() => loadEnv({ ...validEnv, BOT_TOKEN: secret })).toThrow(/BOT_TOKEN/);
    expect(() => loadEnv({ ...validEnv, BOT_TOKEN: secret })).not.toThrow(secret);
  });
});
