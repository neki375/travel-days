import { isIsoDate } from "./day-calculator";

/** Pure trip date rules (SPEC.md §10.1, §10.3). */

export const MIN_TRIP_DATE = "1900-01-01";

export interface DateSpan {
  entryDate: string;
  /** null for an open trip, which extends to +∞ for conflict purposes. */
  exitDate: string | null;
}

export type TripDatesIssue =
  "INVALID_DATE" | "DATE_TOO_EARLY" | "ENTRY_IN_FUTURE" | "EXIT_IN_FUTURE" | "EXIT_BEFORE_ENTRY";

export function validateTripDates(span: DateSpan, today: string): TripDatesIssue | null {
  const { entryDate, exitDate } = span;

  if (!isIsoDate(entryDate) || (exitDate !== null && !isIsoDate(exitDate))) {
    return "INVALID_DATE";
  }
  if (entryDate < MIN_TRIP_DATE) {
    return "DATE_TOO_EARLY";
  }
  if (entryDate > today) {
    return "ENTRY_IN_FUTURE";
  }
  if (exitDate !== null && exitDate > today) {
    return "EXIT_IN_FUTURE";
  }
  if (exitDate !== null && exitDate < entryDate) {
    return "EXIT_BEFORE_ENTRY";
  }
  return null;
}

/**
 * Two trips conflict when A.entry < B.exit and B.entry < A.exit.
 * Sharing a boundary day (exit from A and entry to B on the same date) is allowed.
 */
export function spansConflict(a: DateSpan, b: DateSpan): boolean {
  return startsBeforeEnd(a.entryDate, b.exitDate) && startsBeforeEnd(b.entryDate, a.exitDate);
}

function startsBeforeEnd(entryDate: string, exitDate: string | null): boolean {
  return exitDate === null || entryDate < exitDate;
}

export function findConflict<T extends DateSpan>(
  candidate: DateSpan,
  others: readonly T[],
): T | undefined {
  return others.find((other) => spansConflict(candidate, other));
}
