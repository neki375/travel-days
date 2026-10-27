import { afterAll, describe, expect, it } from "vitest";
import { createDatabase } from "../../src/db/client";
import { authHeaders, createTestApp } from "../helpers/app";
import { TEST_DATABASE_URL, createTestDatabase } from "../helpers/database";

const { db, pool } = createTestDatabase();
const app = createTestApp(db);

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe("error format", () => {
  it("returns NOT_FOUND for an unknown route", async () => {
    const response = await app.inject({ method: "GET", url: "/nope" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });

  it("hides internal details of unexpected errors", async () => {
    const broken = createDatabase(TEST_DATABASE_URL);
    await broken.pool.end();
    const brokenApp = createTestApp(broken.db);

    try {
      const response = await brokenApp.inject({
        method: "GET",
        url: "/api/v1/countries",
        headers: authHeaders(),
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    } finally {
      await brokenApp.close();
    }
  });
});
