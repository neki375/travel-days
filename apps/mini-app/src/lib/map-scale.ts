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

/** 1-based step for a positive number of days, or 0 when the country was not visited. */
export function dayBin(days: number): number {
  if (days <= 0) {
    return 0;
  }
  return DAY_BINS.findIndex((bin) => days <= bin.max) + 1;
}
