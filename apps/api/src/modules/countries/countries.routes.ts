import { listCountriesQuerySchema, type ListCountriesResponse } from "@travel-days/shared";
import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client";
import { parseInput } from "../../lib/validation";
import { listCountries } from "./countries.repository";

export function countriesRoutes(app: FastifyInstance, { db }: { db: Database }): void {
  app.get("/countries", async (request): Promise<ListCountriesResponse> => {
    const query = parseInput(listCountriesQuerySchema, request.query);
    return { items: await listCountries(db, query.search) };
  });
}
