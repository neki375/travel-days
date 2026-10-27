/**
 * Sequential day scale of the world map: fixed, human-sized steps (week, month, quarter)
 * rather than quantiles, so a color means the same thing for every period.
 * Each step is validated as an ordinal ramp in light and dark themes (see styles.css).
 */
export const DAY_BINS = [
  { max: 7, label: "1–7" },
  { max: 30, label: "8–30" },
  { max: 90, label: "31–90" },
  { max: Infinity, label: "91+" },
] as const;

/** Step 0 is "not visited"; steps 1–4 follow DAY_BINS. */
export const NOT_VISITED = 0;

/** 1-based step for a positive number of days, or 0 when the country was not visited. */
export function dayBin(days: number): number {
  if (days <= 0) {
    return NOT_VISITED;
  }
  return DAY_BINS.findIndex((bin) => days <= bin.max) + 1;
}

/** Number of countries per step: index 0 is not visited, 1–4 follow DAY_BINS. */
export function countByBin(
  countries: readonly { days: number }[],
  totalCountries: number,
): number[] {
  const counts = Array.from({ length: DAY_BINS.length + 1 }, () => 0);
  let visited = 0;
  for (const { days } of countries) {
    const bin = dayBin(days);
    if (bin !== NOT_VISITED) {
      counts[bin]! += 1;
      visited += 1;
    }
  }
  counts[NOT_VISITED] = Math.max(0, totalCountries - visited);
  return counts;
}

const pluralRules = new Intl.PluralRules("ru-RU");
const COUNTRY_FORMS: Record<string, string> = {
  one: "страна",
  few: "страны",
  many: "стран",
  other: "страны",
};

/** "1 страна", "3 страны", "242 страны", "25 стран" */
export function formatCountryCount(count: number): string {
  return `${count} ${COUNTRY_FORMS[pluralRules.select(count)] ?? "стран"}`;
}

function binLabel(bin: number): string {
  return bin === NOT_VISITED ? "Не были" : `${DAY_BINS[bin - 1]?.label ?? ""} дней`;
}

/** Readout for an isolated legend step: "8–30 дней: 3 страны", "Не были: 242 страны". */
export function binSummary(bin: number, count: number): string {
  return `${binLabel(bin)}: ${formatCountryCount(count)}`;
}

/** Longest list of names shown in full; longer lists end with "и ещё N". */
const MAX_LISTED_NAMES = 5;

/** Readout naming the countries of a step: "8–30 дней: Таиланд, Вьетнам и ещё 3". */
export function binCountries(bin: number, names: readonly string[]): string {
  if (names.length === 0) {
    return binSummary(bin, 0);
  }
  if (names.length <= MAX_LISTED_NAMES) {
    return `${binLabel(bin)}: ${names.join(", ")}`;
  }
  const listed = names.slice(0, MAX_LISTED_NAMES - 1);
  return `${binLabel(bin)}: ${listed.join(", ")} и ещё ${names.length - listed.length}`;
}
