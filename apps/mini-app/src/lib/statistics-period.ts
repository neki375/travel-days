import type { StatisticsParams } from "./api-client";
import { formatDateRange, startOfYear } from "./dates";

export type PeriodPreset = "year" | "all" | "custom";

export interface CustomPeriod {
  from: string;
  to: string;
}

export type ResolvedPeriod =
  { ok: true; params: StatisticsParams; label: string } | { ok: false; error: string };

/** Query parameters and a caption for the selected period (SPEC.md §1.1, §10.5). */
export function resolvePeriod(
  preset: PeriodPreset,
  today: string,
  custom: CustomPeriod,
): ResolvedPeriod {
  switch (preset) {
    case "year": {
      const year = today.slice(0, 4);
      return {
        ok: true,
        params: { from: startOfYear(today), to: `${year}-12-31` },
        label: `${year} год`,
      };
    }
    case "all":
      return { ok: true, params: {}, label: "За всё время" };
    case "custom":
      if (!custom.from || !custom.to) {
        return { ok: false, error: "Укажите начало и конец периода." };
      }
      if (custom.from > custom.to) {
        return { ok: false, error: "Начало периода позже его конца." };
      }
      return {
        ok: true,
        params: { from: custom.from, to: custom.to },
        label: formatDateRange(custom.from, custom.to),
      };
  }
}

/** Bar length relative to the largest value; non-zero values stay visible. */
export function barPercent(days: number, maxDays: number): number {
  if (days <= 0 || maxDays <= 0) {
    return 0;
  }
  return Math.max(2, Math.round((days / maxDays) * 100));
}
