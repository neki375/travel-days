import type { CurrentTripResponse, ListTripsResponse } from "@travel-days/shared";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/app";
import { createTestDatabase, resetUserData } from "../helpers/database";
import { createTrip, getCurrentTrip, getTrips, postCheckout } from "../helpers/trips";

// TEST_NOW is 2026-10-27 12:00 UTC.
const { db, pool } = createTestDatabase();
const app = createTestApp(db);

afterAll(async () => {
  await app.close();
  await pool.end();
});
beforeEach(() => resetUserData(pool));

async function listEntryDates(query = ""): Promise<string[]> {
  const response = await getTrips(app, query);
  expect(response.statusCode).toBe(200);
  return response.json<ListTripsResponse>().items.map((trip) => trip.entryDate);
}

/** SPEC.md §3.3 example: VN, TH closed, PH open. */
async function seedSpecTrips() {
  await createTrip(app, "VN", "2026-06-10", "2026-06-19");
  await createTrip(app, "TH", "2026-08-01", "2026-08-15");
  await createTrip(app, "PH", "2026-10-01");
}

describe("GET /api/v1/trips", () => {
  it("returns an empty page for a new user", async () => {
    const response = await getTrips(app);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ items: [], nextCursor: null });
  });

  it("lists trips newest first in the unified format", async () => {
    await seedSpecTrips();

    const { items, nextCursor } = (await getTrips(app)).json<ListTripsResponse>();

    expect(nextCursor).toBeNull();
    expect(items).toEqual([
      expect.objectContaining({
        country: { code: "PH", name: "Philippines" },
        days: 27,
        isOpen: true,
      }),
      expect.objectContaining({
        country: { code: "TH", name: "Thailand" },
        days: 15,
        isOpen: false,
      }),
      expect.objectContaining({
        country: { code: "VN", name: "Vietnam" },
        days: 10,
        isOpen: false,
      }),
    ]);
  });

  it("filters by trips intersecting the period", async () => {
    await seedSpecTrips();

    expect(await listEntryDates("?from=2026-06-19&to=2026-08-01")).toEqual([
      "2026-08-01",
      "2026-06-10",
    ]);
    expect(await listEntryDates("?from=2026-08-16")).toEqual(["2026-10-01"]);
    expect(await listEntryDates("?to=2026-06-30")).toEqual(["2026-06-10"]);
    expect(await listEntryDates("?from=2026-06-20&to=2026-07-31")).toEqual([]);
  });

  it("filters by country", async () => {
    await seedSpecTrips();
    await createTrip(app, "TH", "2026-03-01", "2026-03-05");

    expect(await listEntryDates("?country=TH")).toEqual(["2026-08-01", "2026-03-01"]);
  });

  it("pages through all trips without duplicates or gaps", async () => {
    // Several trips share entry dates (one-day transits) to exercise the id tie-breaker.
    const expected: string[] = [];
    for (let day = 1; day <= 9; day++) {
      const date = `2026-09-0${day}`;
      await createTrip(app, "LA", date, date);
      await createTrip(app, "KH", date, date);
      expected.push(date, date);
    }

    const seen: string[] = [];
    const ids = new Set<string>();
    let cursor: string | null = null;
    let pages = 0;
    do {
      const query: string = `?limit=4${cursor ? `&cursor=${cursor}` : ""}`;
      const page: ListTripsResponse = (await getTrips(app, query)).json<ListTripsResponse>();
      page.items.forEach((trip) => {
        ids.add(trip.id);
        seen.push(trip.entryDate);
      });
      cursor = page.nextCursor;
      pages++;
    } while (cursor);

    expect(pages).toBe(5);
    expect(ids.size).toBe(18);
    expect(seen).toEqual(expected.reverse());
  });

  it("returns no next cursor when the last page is exactly full", async () => {
    await seedSpecTrips();

    const page = (await getTrips(app, "?limit=3")).json<ListTripsResponse>();

    expect(page.items).toHaveLength(3);
    expect(page.nextCursor).toBeNull();
  });

  it.each([
    ["invalid cursor", "?cursor=garbage"],
    ["limit above maximum", "?limit=101"],
    ["from after to", "?from=2026-10-10&to=2026-10-01"],
    ["invalid date", "?from=2026-02-30"],
    ["unknown parameter", "?userId=1"],
  ])("rejects %s with VALIDATION_ERROR", async (_name, query) => {
    const response = await getTrips(app, query);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });

  it("shows only the current user's trips", async () => {
    await createTrip(app, "PH", "2026-10-01", null, { telegramId: 1 });
    await createTrip(app, "TH", "2026-10-01", null, { telegramId: 2 });

    const { items } = (await getTrips(app, "", { telegramId: 2 })).json<ListTripsResponse>();

    expect(items.map((trip) => trip.country.code)).toEqual(["TH"]);
  });
});

describe("GET /api/v1/trips/current", () => {
  it("returns null without an open trip", async () => {
    await createTrip(app, "TH", "2026-08-01", "2026-08-15");

    expect((await getCurrentTrip(app)).json()).toEqual({ trip: null });
  });

  it("returns the open trip with days up to today", async () => {
    await seedSpecTrips();

    const { trip } = (await getCurrentTrip(app)).json<CurrentTripResponse>();

    expect(trip).toMatchObject({ country: { code: "PH" }, entryDate: "2026-10-01", days: 27 });
  });

  it("counts days up to the user's today", async () => {
    await createTrip(app, "PH", "2026-10-01");

    // 2026-10-27 12:00 UTC is 2026-10-28 in Pacific/Kiritimati.
    const response = await getCurrentTrip(app, { timeZone: "Pacific/Kiritimati" });

    expect(response.json<CurrentTripResponse>().trip?.days).toBe(28);
  });

  it("returns null after checkout", async () => {
    const tripId = await createTrip(app, "PH", "2026-10-01");
    await postCheckout(app, tripId, { exitDate: "2026-10-20" });

    expect((await getCurrentTrip(app)).json()).toEqual({ trip: null });
  });

  it("does not show another user's open trip", async () => {
    await createTrip(app, "PH", "2026-10-01", null, { telegramId: 1 });

    expect((await getCurrentTrip(app, { telegramId: 2 })).json()).toEqual({ trip: null });
  });
});
