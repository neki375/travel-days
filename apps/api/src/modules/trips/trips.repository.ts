import { and, eq, gte, isNull, lte, ne, or, sql } from "drizzle-orm";
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

export async function setTripExitDate(
  db: DbExecutor,
  tripId: string,
  exitDate: string | null,
): Promise<void> {
  await db
    .update(trips)
    .set({ exitDate, updatedAt: sql`now()` })
    .where(eq(trips.id, tripId));
}
