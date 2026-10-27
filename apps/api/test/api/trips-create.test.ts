import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { authHeaders, createTestApp } from "../helpers/app";
import { createTestDatabase, resetUserData } from "../helpers/database";
import { createTrip, postTrip } from "../helpers/trips";

// TEST_NOW is 2026-10-27 12:00 UTC.
const { db, pool } = createTestDatabase();
const app = createTestApp(db);

afterAll(async () => {
  await app.close();
  await pool.end();
});
beforeEach(() => resetUserData(pool));

async function countTrips(): Promise<number> {
  const { rows } = await pool.query<{ count: number }>("SELECT count(*)::int AS count FROM trips");
  return rows[0]!.count;
}

describe("POST /api/v1/trips — check-in", () => {
  it("creates an open trip and counts days up to today", async () => {
    const response = await postTrip(app, { countryCode: "PH", entryDate: "2026-10-01" });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: expect.any(String) as unknown,
      country: { code: "PH", name: "Philippines" },
      entryDate: "2026-10-01",
      exitDate: null,
      days: 27,
      isOpen: true,
    });
  });

  it("rejects a second open trip with OPEN_TRIP_EXISTS", async () => {
    await createTrip(app, "PH", "2026-10-01");

    const response = await postTrip(app, { countryCode: "TH", entryDate: "2026-10-20" });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error: { code: "OPEN_TRIP_EXISTS" } });
  });

  it("allows entering the next country on the day of the previous exit", async () => {
    await createTrip(app, "TH", "2026-08-01", "2026-08-15");

    const response = await postTrip(app, { countryCode: "VN", entryDate: "2026-08-15" });

    expect(response.statusCode).toBe(201);
  });

  it("rejects an open trip that starts inside a closed trip", async () => {
    await createTrip(app, "TH", "2026-08-01", "2026-08-15");

    const response = await postTrip(app, { countryCode: "VN", entryDate: "2026-08-14" });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error: { code: "TRIP_OVERLAP" } });
  });

  it("rejects an open trip that starts before an existing closed trip", async () => {
    await createTrip(app, "TH", "2026-08-01", "2026-08-15");

    const response = await postTrip(app, { countryCode: "VN", entryDate: "2026-07-01" });

    expect(response.json()).toMatchObject({ error: { code: "TRIP_OVERLAP" } });
  });
});

describe("POST /api/v1/trips — historical trip", () => {
  it("creates a closed trip while another trip is open", async () => {
    await createTrip(app, "PH", "2026-10-01");

    const response = await postTrip(app, {
      countryCode: "TH",
      entryDate: "2026-08-01",
      exitDate: "2026-08-15",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ days: 15, isOpen: false, exitDate: "2026-08-15" });
  });

  it.each([
    ["inside another trip", "2026-08-05", "2026-08-08"],
    ["covering another trip", "2026-07-25", "2026-08-20"],
    ["overlapping the start", "2026-07-25", "2026-08-02"],
    ["one day inside another trip", "2026-08-05", "2026-08-05"],
    ["after the open trip entry", "2026-10-05", "2026-10-08"],
  ])("rejects a trip %s with TRIP_OVERLAP", async (_name, entryDate, exitDate) => {
    await createTrip(app, "TH", "2026-08-01", "2026-08-15");
    await createTrip(app, "PH", "2026-10-01");

    const response = await postTrip(app, { countryCode: "VN", entryDate, exitDate });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error: { code: "TRIP_OVERLAP" } });
  });

  it("allows a one-day transit trip on a boundary day", async () => {
    await createTrip(app, "TH", "2026-08-01", "2026-08-15");
    await createTrip(app, "LA", "2026-08-15", "2026-08-15");

    const response = await postTrip(app, { countryCode: "VN", entryDate: "2026-08-15" });

    expect(response.statusCode).toBe(201);
    expect(await countTrips()).toBe(3);
  });
});

describe("POST /api/v1/trips — validation", () => {
  it.each([
    ["missing body", undefined],
    ["unknown field userId", { countryCode: "PH", entryDate: "2026-10-01", userId: "x" }],
    ["invalid date", { countryCode: "PH", entryDate: "2026-02-30" }],
    ["lowercase country", { countryCode: "ph", entryDate: "2026-10-01" }],
    ["unknown country", { countryCode: "ZZ", entryDate: "2026-10-01" }],
    ["entry in the future", { countryCode: "PH", entryDate: "2026-10-28" }],
    ["exit in the future", { countryCode: "PH", entryDate: "2026-10-01", exitDate: "2026-10-28" }],
    ["exit before entry", { countryCode: "PH", entryDate: "2026-10-10", exitDate: "2026-10-01" }],
    ["date before 1900", { countryCode: "PH", entryDate: "1899-12-31", exitDate: "1900-01-05" }],
  ])("rejects %s with 400 VALIDATION_ERROR", async (_name, body) => {
    const response = await postTrip(app, body);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    expect(await countTrips()).toBe(0);
  });

  it("rejects malformed JSON with VALIDATION_ERROR", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/trips",
      headers: { ...authHeaders(), "content-type": "application/json" },
      payload: "{not json",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });

  it("requires authorization", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/trips",
      payload: { countryCode: "PH", entryDate: "2026-10-01" },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("POST /api/v1/trips — time zone", () => {
  it("uses the X-Timezone date as today", async () => {
    // 2026-10-27 12:00 UTC is already 2026-10-28 in Pacific/Kiritimati (UTC+14).
    const body = { countryCode: "PH", entryDate: "2026-10-28" };

    expect((await postTrip(app, body)).statusCode).toBe(400);

    const response = await postTrip(app, body, { timeZone: "Pacific/Kiritimati" });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ days: 1 });
  });

  it("falls back to UTC for an invalid time zone", async () => {
    const response = await postTrip(
      app,
      { countryCode: "PH", entryDate: "2026-10-28" },
      { timeZone: "Not/AZone" },
    );

    expect(response.statusCode).toBe(400);
  });
});

describe("POST /api/v1/trips — isolation and concurrency", () => {
  it("checks overlaps only against the user's own trips", async () => {
    await createTrip(app, "PH", "2026-10-01", null, { telegramId: 1 });

    const response = await postTrip(
      app,
      { countryCode: "TH", entryDate: "2026-10-01" },
      { telegramId: 2 },
    );

    expect(response.statusCode).toBe(201);
  });

  it("creates exactly one open trip from 20 concurrent check-ins", async () => {
    await createTrip(app, "TH", "2026-01-01", "2026-01-05"); // make sure the user exists

    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        postTrip(app, {
          countryCode: "PH",
          entryDate: `2026-10-${String(index + 1).padStart(2, "0")}`,
        }),
      ),
    );

    const statuses = responses.map((response) => response.statusCode).sort();
    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.filter((status) => status === 409)).toHaveLength(19);
    expect(await countTrips()).toBe(2);
  });

  it("serializes writes so that a one-day trip cannot slip into a concurrent trip", async () => {
    await createTrip(app, "TH", "2024-01-01", "2024-01-02"); // make sure the user exists

    // The database does not check one-day trips, so only the user lock prevents both inserts.
    for (let month = 1; month <= 12; month++) {
      const mm = String(month).padStart(2, "0");
      const responses = await Promise.all([
        postTrip(app, { countryCode: "PH", entryDate: `2025-${mm}-01`, exitDate: `2025-${mm}-10` }),
        postTrip(app, { countryCode: "VN", entryDate: `2025-${mm}-05`, exitDate: `2025-${mm}-05` }),
      ]);

      const statuses = responses.map((response) => response.statusCode).sort();
      expect(statuses).toEqual([201, 409]);
    }
  });
});
