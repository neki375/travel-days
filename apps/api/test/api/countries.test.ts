import type { ListCountriesResponse } from "@travel-days/shared";
import { afterAll, describe, expect, it } from "vitest";
import { authHeaders, createTestApp } from "../helpers/app";
import { createTestDatabase } from "../helpers/database";

const { db, pool } = createTestDatabase();
const app = createTestApp(db);

afterAll(async () => {
  await app.close();
  await pool.end();
});

async function getCountries(query = "") {
  const response = await app.inject({
    method: "GET",
    url: `/api/v1/countries${query}`,
    headers: authHeaders(),
  });
  return response;
}

describe("GET /api/v1/countries", () => {
  it("returns all countries ordered by name", async () => {
    const response = await getCountries();
    const { items } = response.json<ListCountriesResponse>();

    expect(response.statusCode).toBe(200);
    expect(items).toHaveLength(250);
    expect(items[0]).toEqual({ code: "AF", name: "Afghanistan" });
    const names = items.map((item) => item.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("searches by a case-insensitive name substring", async () => {
    const { items } = (await getCountries("?search=phil")).json<ListCountriesResponse>();

    expect(items).toEqual([{ code: "PH", name: "Philippines" }]);
  });

  it("finds a country by its exact code", async () => {
    const { items } = (await getCountries("?search=th")).json<ListCountriesResponse>();

    expect(items).toContainEqual({ code: "TH", name: "Thailand" });
  });

  it("treats LIKE wildcards literally", async () => {
    const { items } = (await getCountries("?search=%25")).json<ListCountriesResponse>();

    expect(items).toEqual([]);
  });

  it("returns everything for a blank search", async () => {
    const { items } = (await getCountries("?search=%20%20")).json<ListCountriesResponse>();

    expect(items).toHaveLength(250);
  });

  it("rejects a too long search with VALIDATION_ERROR", async () => {
    const response = await getCountries(`?search=${"a".repeat(101)}`);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR", details: [{ path: "search" }] },
    });
  });
});
