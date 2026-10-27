import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/app";
import { createTestDatabase, resetUserData } from "../helpers/database";
import { createTrip, postCheckout } from "../helpers/trips";

// TEST_NOW is 2026-10-27 12:00 UTC.
const { db, pool } = createTestDatabase();
const app = createTestApp(db);

afterAll(async () => {
  await app.close();
  await pool.end();
});
beforeEach(() => resetUserData(pool));

describe("POST /api/v1/trips/:id/checkout", () => {
  it("closes the trip including the exit day", async () => {
    const tripId = await createTrip(app, "PH", "2026-10-01");

    const response = await postCheckout(app, tripId, { exitDate: "2026-10-10" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: tripId,
      country: { code: "PH", name: "Philippines" },
      entryDate: "2026-10-01",
      exitDate: "2026-10-10",
      days: 10,
      isOpen: false,
    });
  });

  it("allows exit on the entry day", async () => {
    const tripId = await createTrip(app, "PH", "2026-10-27");

    const response = await postCheckout(app, tripId, { exitDate: "2026-10-27" });

    expect(response.json()).toMatchObject({ days: 1, isOpen: false });
  });

  it("allows checking in again after checkout, on the same day", async () => {
    const tripId = await createTrip(app, "PH", "2026-10-01");
    await postCheckout(app, tripId, { exitDate: "2026-10-20" });

    await expect(createTrip(app, "TH", "2026-10-20")).resolves.toEqual(expect.any(String));
  });

  it("rejects a second checkout with TRIP_ALREADY_CLOSED and keeps the first exit date", async () => {
    const tripId = await createTrip(app, "PH", "2026-10-01");
    await postCheckout(app, tripId, { exitDate: "2026-10-10" });

    const response = await postCheckout(app, tripId, { exitDate: "2026-10-20" });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error: { code: "TRIP_ALREADY_CLOSED" } });
    const { rows } = await pool.query("SELECT exit_date FROM trips WHERE id = $1", [tripId]);
    expect(rows).toEqual([{ exit_date: "2026-10-10" }]);
  });

  it.each([
    ["exit before entry", { exitDate: "2026-09-30" }],
    ["exit in the future", { exitDate: "2026-10-28" }],
    ["invalid date", { exitDate: "2026-10-32" }],
    ["missing exit date", {}],
    ["null exit date", { exitDate: null }],
    ["unknown field", { exitDate: "2026-10-10", userId: "x" }],
  ])("rejects %s with 400 VALIDATION_ERROR", async (_name, body) => {
    const tripId = await createTrip(app, "PH", "2026-10-01");

    const response = await postCheckout(app, tripId, body);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });

  it("rejects a non-UUID id with VALIDATION_ERROR", async () => {
    const response = await postCheckout(app, "not-a-uuid", { exitDate: "2026-10-10" });

    expect(response.statusCode).toBe(400);
  });

  it("returns TRIP_NOT_FOUND for a missing trip", async () => {
    const response = await postCheckout(app, "00000000-0000-4000-8000-000000000000", {
      exitDate: "2026-10-10",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: { code: "TRIP_NOT_FOUND" } });
  });

  it("returns TRIP_NOT_FOUND for another user's trip and leaves it open", async () => {
    const tripId = await createTrip(app, "PH", "2026-10-01", null, { telegramId: 1 });

    const response = await postCheckout(app, tripId, { exitDate: "2026-10-10" }, { telegramId: 2 });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: { code: "TRIP_NOT_FOUND" } });
    const { rows } = await pool.query("SELECT exit_date FROM trips WHERE id = $1", [tripId]);
    expect(rows).toEqual([{ exit_date: null }]);
  });

  it("closes a trip exactly once under concurrent checkouts", async () => {
    const tripId = await createTrip(app, "PH", "2026-10-01");

    const responses = await Promise.all([
      postCheckout(app, tripId, { exitDate: "2026-10-10" }),
      postCheckout(app, tripId, { exitDate: "2026-10-20" }),
    ]);

    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 409]);
  });
});
