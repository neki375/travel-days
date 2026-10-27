import type { Country } from "@travel-days/shared";
import { asc, eq, ilike, or, sql } from "drizzle-orm";
import type { Database } from "../../db/client";
import { countries } from "../../db/schema";

/** Countries ordered by name; `search` matches a name substring or an exact code. */
export async function listCountries(db: Database, search?: string): Promise<Country[]> {
  const filter = search
    ? or(
        ilike(countries.name, `%${escapeLikePattern(search)}%`),
        eq(countries.code, search.toUpperCase()),
      )
    : undefined;

  return (
    db
      .select({ code: countries.code, name: countries.name })
      .from(countries)
      .where(filter)
      // ICU collation: the default libc collation of Alpine images sorts by bytes ("Å" after "Z").
      .orderBy(asc(sql`${countries.name} COLLATE "und-x-icu"`))
  );
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
