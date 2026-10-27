import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/app";
import { createTestDatabase, resetUserData } from "../helpers/database";
import { createTrip, deleteTrip, getTrips, patchTrip } from "../helpers/trips";

// TEST_NOW is 2026-10-27 12:00 UTC.
const { db, pool } = createTestDatabase();
const app = createTestApp(db);

afterAll(async () => {
  await app.close();
  await pool.end();
});
beforeEach(() => resetUserData(pool));

async function tripInDatabase(tripId: string) {
  const { rows } = await pool.query(
    "SELECT country_code, entry_date, exit_date FROM trips WHERE id = $1",
    [tripId],
  );
  return rows[0] as
    { country_code: string; entry_date: string; exit_date: string | null } | undefined;
}

describe("PATCH /api/v1/trips/:id", () => {
  it("changes dates and recalculates days", async () => {
    const tripId = await createTrip(app, "TH", "2026-08-01", "2026-08-15");

    const response = await patchTrip(app, tripId, {
      entryDate: "2026-08-05",
      exitDate: "2026-08-20",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: tripId,
      entryDate: "2026-08-05",
      exitDate: "2026-08-20",
      days: 16,
    });
  });

  it("changes only the given fields", async () => {
    const tripId = await createTrip(app, "TH", "2026-08-01", "2026-08-15");

    const response = await patchTrip(app, tripId, { countryCode: "VN" });

    expect(response.json()).toMatchObject({
      country: { code: "VN", name: "Vietnam" },
      entryDate: "2026-08-01",
      exitDate: "2026-08-15",
    });
  });

  it("closes an open trip", async () => {
    const tripId = await createTrip(app, "PH", "2026-10-01");

    const response = await patchTrip(app, tripId, { exitDate: "2026-10-10" });

    expect(response.json()).toMatchObject({ isOpen: false, days: 10 });
  });

  it("reopens the latest trip with exitDate null", async () => {
    const tripId = await createTrip(app, "PH", "2026-10-01", "2026-10-10");

    const response = await patchTrip(app, tripId, { exitDate: null });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ exitDate: null, isOpen: true, days: 27 });
  });

  it("does not reopen a trip when a later trip exists", async () => {
    const tripId = await createTrip(app, "TH", "2026-08-01", "2026-08-15");
    await createTrip(app, "VN", "2026-09-01", "2026-09-10");

    const response = await patchTrip(app, tripId, { exitDate: null });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error: { code: "TRIP_OVERLAP" } });
  });

  it("does not reopen a trip when another trip is open", async () => {
    const tripId = await createTrip(app, "TH", "2026-08-01", "2026-08-15");
    await createTrip(app, "PH", "2026-10-01");

    const response = await patchTrip(app, tripId, { exitDate: null });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error: { code: "OPEN_TRIP_EXISTS" } });
  });

  it("does not count the edited trip as overlapping itself", async () => {
    const tripId = await createTrip(app, "TH", "2026-08-01", "2026-08-15");

    const response = await patchTrip(app, tripId, { exitDate: "2026-08-16" });

    expect(response.statusCode).toBe(200);
  });

  it("rejects an edit that overlaps another trip and keeps the trip unchanged", async () => {
    await createTrip(app, "TH", "2026-08-01", "2026-08-15");
    const tripId = await createTrip(app, "VN", "2026-08-15", "2026-08-25");

    const response = await patchTrip(app, tripId, { entryDate: "2026-08-14" });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error: { code: "TRIP_OVERLAP" } });
    expect(await tripInDatabase(tripId)).toMatchObject({ entry_date: "2026-08-15" });
  });

  it.each([
    ["empty body", {}],
    ["unknown field", { userId: "x" }],
    ["exit before entry", { exitDate: "2026-07-01" }],
    ["entry after existing exit", { entryDate: "2026-08-20" }],
    ["entry in the future", { entryDate: "2026-10-28", exitDate: null }],
    ["unknown country", { countryCode: "ZZ" }],
    ["invalid date", { entryDate: "2026-02-30" }],
  ])("rejects %s with VALIDATION_ERROR", async (_name, body) => {
    const tripId = await createTrip(app, "TH", "2026-08-01", "2026-08-15");

    const response = await patchTrip(app, tripId, body);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    expect(await tripInDatabase(tripId)).toEqual({
      country_code: "TH",
      entry_date: "2026-08-01",
      exit_date: "2026-08-15",
    });
  });

  it("returns TRIP_NOT_FOUND for another user's trip and leaves it unchanged", async () => {
    const tripId = await createTrip(app, "TH", "2026-08-01", "2026-08-15", { telegramId: 1 });

    const response = await patchTrip(app, tripId, { countryCode: "VN" }, { telegramId: 2 });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: { code: "TRIP_NOT_FOUND" } });
    expect(await tripInDatabase(tripId)).toMatchObject({ country_code: "TH" });
  });

  it("lets only one of two concurrent conflicting edits succeed", async () => {
    const first = await createTrip(app, "TH", "2026-08-01", "2026-08-05");
    const second = await createTrip(app, "VN", "2026-08-20", "2026-08-25");

    // Each edit alone is valid; together they would overlap on 2026-08-10..12.
    const responses = await Promise.all([
      patchTrip(app, first, { exitDate: "2026-08-12" }),
      patchTrip(app, second, { entryDate: "2026-08-10" }),
    ]);

    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 409]);
  });
});

describe("DELETE /api/v1/trips/:id", () => {
  it("deletes the trip and returns 204", async () => {
    const tripId = await createTrip(app, "PH", "2026-10-01");

    const response = await deleteTrip(app, tripId);

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
    expect(await tripInDatabase(tripId)).toBeUndefined();
    expect((await deleteTrip(app, tripId)).statusCode).toBe(404);
  });

  it("allows a new check-in after deleting the open trip", async () => {
    const tripId = await createTrip(app, "PH", "2026-10-01");
    await deleteTrip(app, tripId);

    await expect(createTrip(app, "TH", "2026-10-05")).resolves.toEqual(expect.any(String));
  });

  it("returns TRIP_NOT_FOUND for another user's trip and keeps it", async () => {
    const tripId = await createTrip(app, "PH", "2026-10-01", null, { telegramId: 1 });

    const response = await deleteTrip(app, tripId, { telegramId: 2 });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: { code: "TRIP_NOT_FOUND" } });
    expect(await tripInDatabase(tripId)).toBeDefined();
    const { items } = (await getTrips(app, "", { telegramId: 1 })).json<{ items: unknown[] }>();
    expect(items).toHaveLength(1);
  });

  it("rejects a non-UUID id with VALIDATION_ERROR", async () => {
    expect((await deleteTrip(app, "123")).statusCode).toBe(400);
  });
});
