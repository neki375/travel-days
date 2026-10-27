import { describe, expect, it } from "vitest";
import { countryFlag, countryName, filterCountries, localizeCountries } from "./countries";

const countries = localizeCountries([
  { code: "TH", name: "Thailand" },
  { code: "PH", name: "Philippines" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "XK", name: "Kosovo" },
]);

describe("countryName", () => {
  it("returns the Russian name", () => {
    expect(countryName("PH")).toBe("Филиппины");
    expect(countryName("XK")).toBe("Косово");
  });

  it("falls back for unknown codes", () => {
    expect(countryName("QQ", "Unknown")).toBe("Unknown");
  });
});

describe("localizeCountries", () => {
  it("sorts by Russian name", () => {
    expect(countries.map((country) => country.localName)).toEqual([
      "Косово",
      "ОАЭ",
      "Таиланд",
      "Филиппины",
    ]);
  });
});

describe("filterCountries", () => {
  it.each([
    ["фил", ["PH"]],
    ["ТАИ", ["TH"]],
    ["phil", ["PH"]],
    ["ae", ["AE"]],
    ["", ["XK", "AE", "TH", "PH"]],
    ["  ", ["XK", "AE", "TH", "PH"]],
    ["zzz", []],
  ])("%j → %j", (search, codes) => {
    expect(filterCountries(countries, search).map((country) => country.code)).toEqual(codes);
  });
});

describe("countryFlag", () => {
  it("builds a flag from regional indicators", () => {
    expect(countryFlag("PH")).toBe("🇵🇭");
  });
});
