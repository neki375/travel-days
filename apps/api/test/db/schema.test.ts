import { eq } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { trips, users } from "../../src/db/schema";
import { createTestDatabase, resetUserData } from "../helpers/database";

const { db, pool } = createTestDatabase();

afterAll(() => pool.end());
beforeEach(() => resetUserData(pool));

async function createUser(telegramId = 1001) {
  const [user] = await db.insert(users).values({ telegramId }).returning();
  return user!;
}

async function insertTrip(userId: string, entryDate: string, exitDate: string | null) {
  return db.insert(trips).values({ userId, countryCode: "PH", entryDate, exitDate }).returning();
}

/** Resolves to the Postgres error code of a rejected query. */
async function pgErrorCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    // Drizzle wraps driver errors and keeps the original as `cause`.
    const cause =
      error instanceof Error && error.cause instanceof pg.DatabaseError ? error.cause : error;
    if (cause instanceof pg.DatabaseError) {
      return cause.code;
    }
    throw error;
  }
  return undefined;
}

describe("countries seed", () => {
  it("contains ISO 3166-1 alpha-2 codes plus XK", async () => {
    const { rows } = await pool.query<{ count: string }>("SELECT count(*) FROM countries");
    expect(Number(rows[0]!.count)).toBe(250);

    const result = await pool.query("SELECT code, name FROM countries WHERE code IN ('PH', 'XK')");
    expect(result.rows).toEqual(
      expect.arrayContaining([
        { code: "PH", name: "Philippines" },
        { code: "XK", name: "Kosovo" },
      ]),
    );
  });
});

describe("DATE handling", () => {
  it("returns dates as the same YYYY-MM-DD strings regardless of process time zone", async () => {
    // The integration project runs with TZ=Asia/Manila, where a Date at local midnight
    // serializes to the previous UTC day.
    expect(process.env.TZ).toBe("Asia/Manila");

    const user = await createUser();
    const [trip] = await insertTrip(user.id, "2026-10-01", "2026-10-10");
    expect(trip).toMatchObject({ entryDate: "2026-10-01", exitDate: "2026-10-10" });

    const [selected] = await db.select().from(trips).where(eq(trips.id, trip!.id));
    expect(selected).toMatchObject({ entryDate: "2026-10-01", exitDate: "2026-10-10" });

    const raw = await pool.query("SELECT entry_date FROM trips WHERE id = $1", [trip!.id]);
    expect(raw.rows[0]).toEqual({ entry_date: "2026-10-01" });
  });
});

describe("trips constraints", () => {
  it("rejects exit date before entry date", async () => {
    const user = await createUser();
    expect(await pgErrorCode(insertTrip(user.id, "2026-10-10", "2026-10-01"))).toBe("23514");
  });

  it("rejects a second open trip for the same user", async () => {
    const user = await createUser();
    await insertTrip(user.id, "2026-10-01", null);
    // An open trip is also an infinite range, so either constraint may fire first.
    expect(await pgErrorCode(insertTrip(user.id, "2026-10-05", null))).toMatch(/^(23505|23P01)$/);
  });

  it("rejects overlapping closed trips", async () => {
    const user = await createUser();
    await insertTrip(user.id, "2026-10-01", "2026-10-10");
    expect(await pgErrorCode(insertTrip(user.id, "2026-10-09", "2026-10-20"))).toBe("23P01");
  });

  it("rejects a closed trip after the entry of an open trip", async () => {
    const user = await createUser();
    await insertTrip(user.id, "2026-10-01", null);
    expect(await pgErrorCode(insertTrip(user.id, "2026-10-05", "2026-10-08"))).toBe("23P01");
  });

  it("allows trips sharing a boundary day", async () => {
    const user = await createUser();
    await insertTrip(user.id, "2026-10-01", "2026-10-10");
    await insertTrip(user.id, "2026-10-10", "2026-10-20");
    await insertTrip(user.id, "2026-10-20", null);

    const { rows } = await pool.query("SELECT count(*)::int AS count FROM trips");
    expect(rows[0]).toEqual({ count: 3 });
  });

  it("allows overlapping trips of different users", async () => {
    const first = await createUser(1);
    const second = await createUser(2);
    await insertTrip(first.id, "2026-10-01", null);
    await insertTrip(second.id, "2026-10-01", null);
  });

  it("does not check one-day trips (documented limitation: the service does)", async () => {
    const user = await createUser();
    await insertTrip(user.id, "2026-10-01", "2026-10-10");
    expect(await pgErrorCode(insertTrip(user.id, "2026-10-05", "2026-10-05"))).toBeUndefined();
  });

  it("rejects an unknown country code", async () => {
    const user = await createUser();
    const code = await pgErrorCode(
      db.insert(trips).values({ userId: user.id, countryCode: "ZZ", entryDate: "2026-10-01" }),
    );
    expect(code).toBe("23503");
  });

  it("deletes trips together with the user", async () => {
    const user = await createUser();
    await insertTrip(user.id, "2026-10-01", null);
    await db.delete(users).where(eq(users.id, user.id));

    const { rows } = await pool.query("SELECT count(*)::int AS count FROM trips");
    expect(rows[0]).toEqual({ count: 0 });
  });
});
