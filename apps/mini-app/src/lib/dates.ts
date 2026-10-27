/**
 * Calendar dates are YYYY-MM-DD strings end to end. They are never parsed with
 * `new Date("YYYY-MM-DD")`, which means UTC midnight and shifts the day in western zones.
 */

export function getDeviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** The device's local calendar date; a default for forms, the server decides what is "today". */
export function localToday(now: Date = new Date()): string {
  const year = String(now.getFullYear()).padStart(4, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** First day of the year of an ISO date. */
export function startOfYear(isoDate: string): string {
  return `${isoDate.slice(0, 4)}-01-01`;
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const shortDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function toUtcDate(isoDate: string): Date {
  const [year = 0, month = 1, day = 1] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** "1 октября 2026 г." */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(toUtcDate(isoDate));
}

/** "1 окт. 2026 г." */
export function formatShortDate(isoDate: string): string {
  return shortDateFormatter.format(toUtcDate(isoDate));
}

/** "1 окт. 2026 г. — 10 окт. 2026 г.", "1 окт. 2026 г. — сейчас" or a single date. */
export function formatDateRange(entryDate: string, exitDate: string | null): string {
  if (exitDate === entryDate) {
    return formatShortDate(entryDate);
  }
  return `${formatShortDate(entryDate)} — ${exitDate ? formatShortDate(exitDate) : "сейчас"}`;
}

const pluralRules = new Intl.PluralRules("ru-RU");
const DAY_FORMS: Record<string, string> = {
  one: "день",
  few: "дня",
  many: "дней",
  other: "дня",
};

/** "1 день", "3 дня", "27 дней" */
export function formatDays(days: number): string {
  return `${days} ${DAY_FORMS[pluralRules.select(days)] ?? "дней"}`;
}
