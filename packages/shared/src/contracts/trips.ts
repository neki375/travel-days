import { z } from "zod";
import { countryCodeSchema, type Country } from "./countries";

/** Real calendar date in YYYY-MM-DD format (leap years included). */
export const isoDateSchema = z.iso.date();

export const createTripBodySchema = z.strictObject({
  countryCode: countryCodeSchema,
  entryDate: isoDateSchema,
  /** Absent or null creates an open trip (check-in); a date creates a closed historical trip. */
  exitDate: isoDateSchema.nullable().optional(),
});

export type CreateTripInput = z.infer<typeof createTripBodySchema>;

export const checkoutTripBodySchema = z.strictObject({
  exitDate: isoDateSchema,
});

export type CheckoutTripInput = z.infer<typeof checkoutTripBodySchema>;

export const tripIdParamsSchema = z.strictObject({
  id: z.uuid(),
});

/** Unified trip representation in every API response (SPEC.md §10.4). */
export interface Trip {
  id: string;
  country: Country;
  entryDate: string;
  exitDate: string | null;
  /** Days so far, both boundary dates included; computed at response time. */
  days: number;
  isOpen: boolean;
}
