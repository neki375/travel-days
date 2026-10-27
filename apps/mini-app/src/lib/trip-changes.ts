import type { Trip, UpdateTripInput } from "@travel-days/shared";

export interface TripValues {
  countryCode: string;
  entryDate: string;
  exitDate: string | null;
}

/** The PATCH body with only the fields that differ from the trip; null when nothing changed. */
export function buildTripChanges(trip: Trip, values: TripValues): UpdateTripInput | null {
  const changes: UpdateTripInput = {};
  if (values.countryCode !== trip.country.code) {
    changes.countryCode = values.countryCode;
  }
  if (values.entryDate !== trip.entryDate) {
    changes.entryDate = values.entryDate;
  }
  if (values.exitDate !== trip.exitDate) {
    changes.exitDate = values.exitDate;
  }
  return Object.keys(changes).length > 0 ? changes : null;
}
