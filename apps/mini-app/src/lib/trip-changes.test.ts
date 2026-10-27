import type { Trip } from "@travel-days/shared";
import { describe, expect, it } from "vitest";
import { buildTripChanges } from "./trip-changes";

const trip: Trip = {
  id: "1",
  country: { code: "TH", name: "Thailand" },
  entryDate: "2026-08-01",
  exitDate: "2026-08-15",
  days: 15,
  isOpen: false,
};

const unchanged = { countryCode: "TH", entryDate: "2026-08-01", exitDate: "2026-08-15" };

describe("buildTripChanges", () => {
  it("returns null when nothing changed", () => {
    expect(buildTripChanges(trip, unchanged)).toBeNull();
  });

  it("includes only changed fields", () => {
    expect(buildTripChanges(trip, { ...unchanged, countryCode: "VN" })).toEqual({
      countryCode: "VN",
    });
    expect(buildTripChanges(trip, { ...unchanged, entryDate: "2026-08-02" })).toEqual({
      entryDate: "2026-08-02",
    });
  });

  it("sends exitDate null to reopen a trip", () => {
    expect(buildTripChanges(trip, { ...unchanged, exitDate: null })).toEqual({ exitDate: null });
  });

  it("sends exitDate to close an open trip", () => {
    const openTrip = { ...trip, exitDate: null, isOpen: true };

    expect(buildTripChanges(openTrip, unchanged)).toEqual({ exitDate: "2026-08-15" });
  });
});
