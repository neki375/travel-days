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

export const updateTripBodySchema = z
  .strictObject({
    countryCode: countryCodeSchema.optional(),
    entryDate: isoDateSchema.optional(),
    /** null reopens the trip; absent keeps the current value. */
    exitDate: isoDateSchema.nullable().optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: "At least one field is required",
  });

export type UpdateTripInput = z.infer<typeof updateTripBodySchema>;

export const tripIdParamsSchema = z.strictObject({
  id: z.uuid(),
});

export const TRIPS_PAGE_DEFAULT_LIMIT = 50;
export const TRIPS_PAGE_MAX_LIMIT = 100;

/** Query of GET /trips; from/to select trips that intersect the period (SPEC.md §10.5). */
export const listTripsQuerySchema = z
  .strictObject({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    country: countryCodeSchema.optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(TRIPS_PAGE_MAX_LIMIT)
      .default(TRIPS_PAGE_DEFAULT_LIMIT),
    /** Opaque value of nextCursor from the previous page. */
    cursor: z.string().min(1).max(200).optional(),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "from must not be after to",
    path: ["from"],
  });

export type ListTripsQuery = z.infer<typeof listTripsQuerySchema>;

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

export interface ListTripsResponse {
  items: Trip[];
  nextCursor: string | null;
}

export interface CurrentTripResponse {
  trip: Trip | null;
}
