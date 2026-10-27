import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import type { DbExecutor } from "../../db/client";
import { trips } from "../../db/schema";
import type { CountryTrip } from "./aggregate";

/** The user's trips that share at least one day with [from, to]; null bounds are open. */
export async function findTripsInPeriod(
  db: DbExecutor,
  userId: string,
  from: string | null,
  to: string,
): Promise<CountryTrip[]> {
  return db
    .select({
      countryCode: trips.countryCode,
      entryDate: trips.entryDate,
      exitDate: trips.exitDate,
    })
    .from(trips)
    .where(
      and(
        eq(trips.userId, userId),
        lte(trips.entryDate, to),
        from === null ? undefined : or(isNull(trips.exitDate), gte(trips.exitDate, from)),
      ),
    );
}
