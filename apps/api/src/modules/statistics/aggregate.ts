import type { CountryDays } from "@travel-days/shared";
import { calculateDaysInPeriod, type Period } from "../trips/day-calculator";
import type { DateSpan } from "../trips/trip-rules";

export interface CountryTrip extends DateSpan {
  countryCode: string;
}

export interface CountryStatistics {
  countries: CountryDays[];
  /** Sum over countries; may exceed the period length because boundary days count twice. */
  totalCountryDays: number;
}

/** Days per country within the period, sorted by days desc, then country code. */
export function aggregateCountryDays(
  trips: readonly CountryTrip[],
  period: Period,
  today: string,
): CountryStatistics {
  const daysByCountry = new Map<string, number>();

  for (const trip of trips) {
    const days = calculateDaysInPeriod(trip.entryDate, trip.exitDate, period, today);
    if (days > 0) {
      daysByCountry.set(trip.countryCode, (daysByCountry.get(trip.countryCode) ?? 0) + days);
    }
  }

  const countries = [...daysByCountry]
    .map(([countryCode, days]) => ({ countryCode, days }))
    .sort((a, b) => b.days - a.days || a.countryCode.localeCompare(b.countryCode));

  return {
    countries,
    totalCountryDays: countries.reduce((sum, item) => sum + item.days, 0),
  };
}
