/**
 * Calendar date arithmetic for trips. Dates are ISO strings YYYY-MM-DD.
 * UTC is used only for arithmetic, never to interpret a moment in time.
 * Pure module: no knowledge of HTTP, Telegram or the database.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** Days since 1970-01-01, or null when the value is not a real calendar date. */
function toEpochDay(value: string): number | null {
  const match = ISO_DATE.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  // Date.UTC rolls over invalid days (2026-02-30) and maps years 0–99 to 1900–1999.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date.getTime() / MS_PER_DAY;
}

export function isIsoDate(value: string): boolean {
  return toEpochDay(value) !== null;
}

function parseIsoDate(value: string): number {
  const epochDay = toEpochDay(value);
  if (epochDay === null) {
    throw new Error("INVALID_DATE");
  }
  return epochDay;
}

/** Number of days between two dates, counting both boundary dates. */
export function calculateDays(entryDate: string, exitDate: string): number {
  const difference = parseIsoDate(exitDate) - parseIsoDate(entryDate);

  if (difference < 0) {
    throw new Error("EXIT_BEFORE_ENTRY");
  }

  return difference + 1;
}

/** Days of a trip so far; an open trip (exitDate = null) is counted up to `today`. */
export function calculateTripDays(
  entryDate: string,
  exitDate: string | null,
  today: string,
): number {
  return calculateDays(entryDate, exitDate ?? today);
}

export interface Period {
  /** Inclusive start; null means "from the beginning of history". */
  from: string | null;
  /** Inclusive end; null means "up to today". */
  to: string | null;
}

/**
 * Days of a trip that fall within the period, both ends inclusive.
 * An open trip ends at min(today, period.to).
 */
export function calculateDaysInPeriod(
  entryDate: string,
  exitDate: string | null,
  period: Period,
  today: string,
): number {
  const start = maxDate(entryDate, period.from ?? entryDate);
  const end = minDate(exitDate ?? today, period.to ?? today);

  return start > end ? 0 : calculateDays(start, end);
}

// ISO dates with four-digit years compare correctly as strings.
function maxDate(a: string, b: string): string {
  return a > b ? a : b;
}

function minDate(a: string, b: string): string {
  return a < b ? a : b;
}
