import type { StatisticsResponse } from "@travel-days/shared";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { authHeaders, createTestApp } from "../helpers/app";
import { createTestDatabase, resetUserData } from "../helpers/database";
import { createTrip, deleteTrip, patchTrip, postCheckout, type RequestAs } from "../helpers/trips";

// TEST_NOW is 2026-10-27 12:00 UTC.
const { db, pool } = createTestDatabase();
const app = createTestApp(db);

afterAll(async () => {
  await app.close();
  await pool.end();
});
beforeEach(() => resetUserData(pool));

function getStatistics(query = "", { telegramId = 1001, timeZone }: RequestAs = {}) {
  return app.inject({
    method: "GET",
    url: `/api/v1/statistics${query}`,
    headers: { ...authHeaders(telegramId), ...(timeZone ? { "x-timezone": timeZone } : {}) },
  });
}

async function statistics(query = "", as: RequestAs = {}): Promise<StatisticsResponse> {
  const response = await getStatistics(query, as);
  expect(response.statusCode).toBe(200);
  return response.json<StatisticsResponse>();
}

/** SPEC.md §3.3 example. */
async function seedSpecTrips() {
  await createTrip(app, "VN", "2026-06-10", "2026-06-19");
  await createTrip(app, "TH", "2026-08-01", "2026-08-15");
  return createTrip(app, "PH", "2026-10-01");
}

describe("GET /api/v1/statistics", () => {
  it("reproduces the SPEC.md example", async () => {
    await seedSpecTrips();

    expect(await statistics("?from=2026-07-01&to=2026-12-31")).toEqual({
      from: "2026-07-01",
      to: "2026-12-31",
      countries: [
        { countryCode: "PH", days: 27 },
        { countryCode: "TH", days: 15 },
      ],
      totalCountryDays: 42,
    });
  });

  it("counts all history when no period is given", async () => {
    await seedSpecTrips();
    await createTrip(app, "TH", "2019-03-01", "2019-03-10");

    expect(await statistics()).toEqual({
      from: null,
      to: null,
      countries: [
        { countryCode: "PH", days: 27 },
        { countryCode: "TH", days: 25 },
        { countryCode: "VN", days: 10 },
      ],
      totalCountryDays: 62,
    });
  });

  it("clips trips to the period", async () => {
    await seedSpecTrips();

    expect(await statistics("?from=2026-08-10&to=2026-10-05")).toMatchObject({
      countries: [
        { countryCode: "TH", days: 6 },
        { countryCode: "PH", days: 5 },
      ],
      totalCountryDays: 11,
    });
  });

  it("ends the open trip at today when the period reaches into the future", async () => {
    await createTrip(app, "PH", "2026-10-01");

    expect((await statistics("?to=2027-12-31")).countries).toEqual([
      { countryCode: "PH", days: 27 },
    ]);
  });

  it("counts the open trip up to the user's today", async () => {
    await createTrip(app, "PH", "2026-10-01");

    const result = await statistics("", { timeZone: "Pacific/Kiritimati" });

    expect(result.countries).toEqual([{ countryCode: "PH", days: 28 }]);
  });

  it("counts a transfer day in both countries", async () => {
    await createTrip(app, "TH", "2026-08-01", "2026-08-10");
    await createTrip(app, "VN", "2026-08-10", "2026-08-12");

    expect(await statistics("?from=2026-08-10&to=2026-08-10")).toMatchObject({
      countries: [
        { countryCode: "TH", days: 1 },
        { countryCode: "VN", days: 1 },
      ],
      totalCountryDays: 2,
    });
  });

  it("returns empty statistics for a period without trips", async () => {
    await seedSpecTrips();

    expect(await statistics("?from=2026-07-01&to=2026-07-31")).toEqual({
      from: "2026-07-01",
      to: "2026-07-31",
      countries: [],
      totalCountryDays: 0,
    });
  });

  it("recalculates after editing, closing and deleting trips", async () => {
    const openTripId = await seedSpecTrips();
    const [thTrip] = (
      await pool.query<{ id: string }>("SELECT id FROM trips WHERE country_code = 'TH'")
    ).rows;
    const year = "?from=2026-01-01&to=2026-12-31";

    await patchTrip(app, thTrip!.id, { exitDate: "2026-08-20" });
    expect((await statistics(year)).countries).toContainEqual({ countryCode: "TH", days: 20 });

    await postCheckout(app, openTripId, { exitDate: "2026-10-05" });
    expect((await statistics(year)).countries).toContainEqual({ countryCode: "PH", days: 5 });

    await deleteTrip(app, thTrip!.id);
    expect(await statistics(year)).toMatchObject({
      countries: [
        { countryCode: "VN", days: 10 },
        { countryCode: "PH", days: 5 },
      ],
      totalCountryDays: 15,
    });
  });

  it("includes only the current user's trips", async () => {
    await createTrip(app, "PH", "2026-10-01", null, { telegramId: 1 });
    await createTrip(app, "TH", "2026-10-20", null, { telegramId: 2 });

    expect((await statistics("", { telegramId: 2 })).countries).toEqual([
      { countryCode: "TH", days: 8 },
    ]);
  });

  it.each([
    ["from after to", "?from=2026-10-10&to=2026-10-01"],
    ["invalid date", "?from=2026-02-30"],
    ["unknown parameter", "?userId=1"],
  ])("rejects %s with VALIDATION_ERROR", async (_name, query) => {
    const response = await getStatistics(query);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });

  it("requires authorization", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/statistics" });

    expect(response.statusCode).toBe(401);
  });
});
