import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase, resetUserData } from "../helpers/database";
import { authHeaders, createTestApp } from "../helpers/app";
import { TEST_NOW, signInitData } from "../helpers/init-data";

const { db, pool } = createTestDatabase();
const app = createTestApp(db);

afterAll(async () => {
  await app.close();
  await pool.end();
});
beforeEach(() => resetUserData(pool));

const protectedUrl = "/api/v1/countries";

async function countUsers(): Promise<number> {
  const { rows } = await pool.query<{ count: number }>("SELECT count(*)::int AS count FROM users");
  return rows[0]!.count;
}

describe("Telegram initData authorization", () => {
  it.each([
    ["no header", {}],
    ["empty header", { authorization: "" }],
    ["another scheme", { authorization: `Bearer ${signInitData()}` }],
    ["scheme without data", { authorization: "tma " }],
    ["unsigned data", { authorization: "tma user=%7B%22id%22%3A1%7D&auth_date=1" }],
    ["forged user", { authorization: `tma ${signInitData().replace("1001", "1002")}` }],
    ["another bot", { authorization: `tma ${signInitData({ botToken: "999:OTHER" })}` }],
    [
      "expired data",
      authHeaders(1001, { authDate: new Date(TEST_NOW.getTime() - 2 * 86_400_000) }),
    ],
  ])("rejects %s with 401 UNAUTHORIZED", async (_name, headers) => {
    const response = await app.inject({ method: "GET", url: protectedUrl, headers });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: expect.any(String) as unknown },
    });
    expect(await countUsers()).toBe(0);
  });

  it("accepts a lowercase or uppercase scheme", async () => {
    const initData = signInitData();

    for (const scheme of ["tma", "TMA"]) {
      const response = await app.inject({
        method: "GET",
        url: protectedUrl,
        headers: { authorization: `${scheme} ${initData}` },
      });
      expect(response.statusCode).toBe(200);
    }
  });

  it("creates the user on the first valid request and reuses it later", async () => {
    await app.inject({ method: "GET", url: protectedUrl, headers: authHeaders(555) });
    await app.inject({ method: "GET", url: protectedUrl, headers: authHeaders(555) });

    const { rows } = await pool.query("SELECT telegram_id FROM users");
    expect(rows).toEqual([{ telegram_id: "555" }]);
  });

  it("creates exactly one user under concurrent first requests", async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        app.inject({ method: "GET", url: protectedUrl, headers: authHeaders(777) }),
      ),
    );

    expect(responses.map((response) => response.statusCode)).toEqual(Array(10).fill(200));
    expect(await countUsers()).toBe(1);
  });

  it("ignores a telegram id passed in the query string", async () => {
    const response = await app.inject({
      method: "GET",
      url: `${protectedUrl}?telegramId=999`,
      headers: authHeaders(1001),
    });

    // Unknown query parameters are rejected, and no user is derived from them.
    expect(response.statusCode).toBe(400);
    const { rows } = await pool.query("SELECT telegram_id FROM users");
    expect(rows).toEqual([{ telegram_id: "1001" }]);
  });

  it("does not require authorization for the health check", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});
