import { z } from "zod";

export const countryCodeSchema = z.string().regex(/^[A-Z]{2}$/, "Expected ISO 3166-1 alpha-2 code");

export const listCountriesQuerySchema = z.strictObject({
  search: z.string().trim().max(100).optional(),
});

export type ListCountriesQuery = z.infer<typeof listCountriesQuerySchema>;

export interface Country {
  code: string;
  name: string;
}

export interface ListCountriesResponse {
  items: Country[];
}
