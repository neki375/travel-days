import type { Country } from "@travel-days/shared";

const regionNames = new Intl.DisplayNames(["ru"], { type: "region", fallback: "none" });

/** Russian country name; falls back to the English name from the API. */
export function countryName(code: string, fallback = code): string {
  try {
    return regionNames.of(code) ?? fallback;
  } catch {
    return fallback;
  }
}

export interface LocalizedCountry extends Country {
  localName: string;
}

export function localizeCountries(countries: readonly Country[]): LocalizedCountry[] {
  return countries
    .map((country) => ({ ...country, localName: countryName(country.code, country.name) }))
    .sort((a, b) => a.localName.localeCompare(b.localName, "ru"));
}

/** Matches the Russian or English name by substring, or the exact ISO code. */
export function filterCountries(
  countries: readonly LocalizedCountry[],
  search: string,
): LocalizedCountry[] {
  const query = search.trim().toLocaleLowerCase("ru");
  if (!query) {
    return [...countries];
  }
  return countries.filter(
    (country) =>
      country.localName.toLocaleLowerCase("ru").includes(query) ||
      country.name.toLowerCase().includes(query) ||
      country.code.toLowerCase() === query,
  );
}

/** Regional indicator symbols render as a flag emoji on most platforms. */
export function countryFlag(code: string): string {
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((char) => 0x1f1a5 + char.charCodeAt(0)),
  );
}
