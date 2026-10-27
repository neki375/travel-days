import { and, desc, eq, gte, isNull, lte, ne, or, sql } from "drizzle-orm";
import type { DbExecutor, Transaction } from "../../db/client";
import { countries, trips, users } from "../../db/schema";
import type { DateSpan } from "./trip-rules";

export interface TripRow {
  id: string;
  countryCode: string;
  countryName: string;
  entryDate: string;
  exitDate: string | null;
}

export interface TripSpanRow extends DateSpan {
  id: string;
}

const tripColumns = {
  id: trips.id,
  countryCode: trips.countryCode,
  countryName: countries.name,
  entryDate: trips.entryDate,
  exitDate: trips.exitDate,
};

/**
 * Serializes all trip writes of one user: concurrent transactions wait here until the
 * current one commits, then see its rows (READ COMMITTED takes a new snapshot per statement).
 */
export async function lockUser(tx: Transaction, userId: string): Promise<void> {
  await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
}

export async function countryExists(db: DbExecutor, code: string): Promise<boolean> {
  const [country] = await db
    .select({ code: countries.code })
    .from(countries)
    .where(eq(countries.code, code));
  return country !== undefined;
}

/**
 * Trips that share at least one calendar day with the span (a superset of conflicts).
 * The exact overlap rule is applied by the caller in trip-rules.
 */
export async function findTripsTouchingSpan(
  db: DbExecutor,
  userId: string,
  span: DateSpan,
  excludeTripId?: string,
): Promise<TripSpanRow[]> {
  return db
    .select({ id: trips.id, entryDate: trips.entryDate, exitDate: trips.exitDate })
    .from(trips)
    .where(
      and(
        eq(trips.userId, userId),
        excludeTripId === undefined ? undefined : ne(trips.id, excludeTripId),
        span.exitDate === null ? undefined : lte(trips.entryDate, span.exitDate),
        or(isNull(trips.exitDate), gte(trips.exitDate, span.entryDate)),
      ),
    );
}

export async function insertTrip(
  db: DbExecutor,
  values: { userId: string; countryCode: string; entryDate: string; exitDate: string | null },
): Promise<string> {
  const [row] = await db.insert(trips).values(values).returning({ id: trips.id });
  return row!.id;
}

/** A trip of the given user, or undefined; other users' trips are indistinguishable from missing. */
export async function findUserTrip(
  db: DbExecutor,
  userId: string,
  tripId: string,
): Promise<TripRow | undefined> {
  const [row] = await db
    .select(tripColumns)
    .from(trips)
    .innerJoin(countries, eq(countries.code, trips.countryCode))
    .where(and(eq(trips.id, tripId), eq(trips.userId, userId)));
  return row;
}

export interface TripChanges {
  countryCode?: string;
  entryDate?: string;
  exitDate?: string | null;
}

export async function updateTrip(
  db: DbExecutor,
  tripId: string,
  changes: TripChanges,
): Promise<void> {
  await db
    .update(trips)
    .set({ ...changes, updatedAt: sql`now()` })
    .where(eq(trips.id, tripId));
}

/** Returns false when the user has no such trip. */
export async function deleteUserTrip(
  db: DbExecutor,
  userId: string,
  tripId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
    .returning({ id: trips.id });
  return deleted.length > 0;
}

export async function findOpenTrip(db: DbExecutor, userId: string): Promise<TripRow | undefined> {
  const [row] = await db
    .select(tripColumns)
    .from(trips)
    .innerJoin(countries, eq(countries.code, trips.countryCode))
    .where(and(eq(trips.userId, userId), isNull(trips.exitDate)));
  return row;
}

export interface TripsPageQuery {
  /** Trips that end on or after this date (open trips always qualify). */
  from?: string | undefined;
  /** Trips that start on or before this date. */
  to?: string | undefined;
  countryCode?: string | undefined;
  /** Exclusive position in the (entryDate DESC, id DESC) order. */
  after?: { entryDate: string; id: string } | undefined;
  limit: number;
}

/** A page of the user's trips, newest entry first. */
export async function listUserTrips(
  db: DbExecutor,
  userId: string,
  query: TripsPageQuery,
): Promise<TripRow[]> {
  const { from, to, countryCode, after, limit } = query;

  return db
    .select(tripColumns)
    .from(trips)
    .innerJoin(countries, eq(countries.code, trips.countryCode))
    .where(
      and(
        eq(trips.userId, userId),
        from === undefined ? undefined : or(isNull(trips.exitDate), gte(trips.exitDate, from)),
        to === undefined ? undefined : lte(trips.entryDate, to),
        countryCode === undefined ? undefined : eq(trips.countryCode, countryCode),
        after === undefined
          ? undefined
          : sql`(${trips.entryDate}, ${trips.id}) < (${after.entryDate}::date, ${after.id}::uuid)`,
      ),
    )
    .orderBy(desc(trips.entryDate), desc(trips.id))
    .limit(limit);
}
