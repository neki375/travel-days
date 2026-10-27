import { z } from "zod";
import { isoDateSchema } from "./trips";

/** Without from: since the first trip; without to: up to the user's today (SPEC.md §10.5). */
export const statisticsQuerySchema = z
  .strictObject({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "from must not be after to",
    path: ["from"],
  });

export type StatisticsQuery = z.infer<typeof statisticsQuerySchema>;

export interface CountryDays {
  countryCode: string;
  days: number;
}

export interface StatisticsResponse {
  from: string | null;
  to: string | null;
  /** Sorted by days desc, then country code. */
  countries: CountryDays[];
  /** Sum over countries; may exceed the period length because transfer days count twice. */
  totalCountryDays: number;
}
