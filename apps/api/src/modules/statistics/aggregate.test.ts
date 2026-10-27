import { describe, expect, it } from "vitest";
import { aggregateCountryDays, type CountryTrip } from "./aggregate";

const today = "2026-10-27";

// Example from SPEC.md §3.3 and §4.7.
const specTrips: CountryTrip[] = [
  { countryCode: "PH", entryDate: "2026-10-01", exitDate: null },
  { countryCode: "TH", entryDate: "2026-08-01", exitDate: "2026-08-15" },
  { countryCode: "VN", entryDate: "2026-06-10", exitDate: "2026-06-19" },
];

describe("aggregateCountryDays", () => {
  it("sums days per country and sorts by days desc", () => {
    const result = aggregateCountryDays(specTrips, { from: "2026-07-01", to: "2026-12-31" }, today);

    expect(result).toEqual({
      countries: [
        { countryCode: "PH", days: 27 },
        { countryCode: "TH", days: 15 },
      ],
      totalCountryDays: 42,
    });
  });

  it("counts all history when the period is unbounded", () => {
    const result = aggregateCountryDays(specTrips, { from: null, to: null }, today);

    expect(result.totalCountryDays).toBe(52);
  });

  it("adds up several trips to the same country", () => {
    const trips: CountryTrip[] = [
      { countryCode: "TH", entryDate: "2026-01-01", exitDate: "2026-01-10" },
      { countryCode: "TH", entryDate: "2026-03-01", exitDate: "2026-03-05" },
    ];

    expect(aggregateCountryDays(trips, { from: null, to: null }, today).countries).toEqual([
      { countryCode: "TH", days: 15 },
    ]);
  });

  it("counts the transfer day in both countries", () => {
    const trips: CountryTrip[] = [
      { countryCode: "TH", entryDate: "2026-10-01", exitDate: "2026-10-10" },
      { countryCode: "VN", entryDate: "2026-10-10", exitDate: "2026-10-20" },
    ];

    const result = aggregateCountryDays(trips, { from: "2026-10-01", to: "2026-10-20" }, today);

    expect(result.countries).toEqual([
      { countryCode: "VN", days: 11 },
      { countryCode: "TH", days: 10 },
    ]);
    expect(result.totalCountryDays).toBe(21);
  });

  it("breaks ties by country code", () => {
    const trips: CountryTrip[] = [
      { countryCode: "VN", entryDate: "2026-01-01", exitDate: "2026-01-05" },
      { countryCode: "LA", entryDate: "2026-02-01", exitDate: "2026-02-05" },
    ];

    expect(
      aggregateCountryDays(trips, { from: null, to: null }, today).countries.map(
        (item) => item.countryCode,
      ),
    ).toEqual(["LA", "VN"]);
  });

  it("omits countries without days in the period", () => {
    const result = aggregateCountryDays(specTrips, { from: "2026-09-01", to: "2026-09-30" }, today);

    expect(result).toEqual({ countries: [], totalCountryDays: 0 });
  });
});
