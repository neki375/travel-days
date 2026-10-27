import type { StatisticsQuery, StatisticsResponse } from "@travel-days/shared";
import type { Database } from "../../db/client";
import { aggregateCountryDays } from "./aggregate";
import { findTripsInPeriod } from "./statistics.repository";

export type StatisticsService = ReturnType<typeof createStatisticsService>;

/** Statistics are always derived from trips; nothing is stored (SPEC.md §1.3). */
export function createStatisticsService(db: Database) {
  return {
    async get(userId: string, query: StatisticsQuery, today: string): Promise<StatisticsResponse> {
      const period = { from: query.from ?? null, to: query.to ?? null };
      const trips = await findTripsInPeriod(db, userId, period.from, period.to ?? today);

      return { ...period, ...aggregateCountryDays(trips, period, today) };
    },
  };
}
