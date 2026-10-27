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

/** Colloquial Russian names that differ from the official ones returned by Intl. */
const ALIASES: Record<string, readonly string[]> = {
  US: ["США", "Америка"],
  GB: ["Англия", "Британия", "Шотландия"],
  AE: ["Эмираты", "Объединённые Арабские Эмираты"],
  NL: ["Голландия"],
  CZ: ["Чешская Республика"],
  KR: ["Южная Корея"],
  KP: ["Северная Корея"],
};

/** Case-insensitive; й/и and ё/е are treated as equal ("Тайланд" finds "Таиланд"). */
function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("ru").replaceAll("й", "и").replaceAll("ё", "е");
}

/** Matches the Russian, English or colloquial name by substring, or the exact ISO code. */
export function filterCountries(
  countries: readonly LocalizedCountry[],
  search: string,
): LocalizedCountry[] {
  const query = normalize(search);
  if (!query) {
    return [...countries];
  }
  return countries.filter(
    (country) =>
      [country.localName, country.name, ...(ALIASES[country.code] ?? [])].some((name) =>
        normalize(name).includes(query),
      ) || country.code.toLowerCase() === query,
  );
}

/** Regional indicator symbols render as a flag emoji on most platforms. */
export function countryFlag(code: string): string {
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((char) => 0x1f1a5 + char.charCodeAt(0)),
  );
}
