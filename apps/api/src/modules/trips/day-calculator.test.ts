import { describe, expect, it } from "vitest";
import {
  calculateDays,
  calculateDaysInPeriod,
  calculateTripDays,
  isIsoDate,
} from "./day-calculator";

describe("calculateDays", () => {
  it.each([
    ["2026-10-01", "2026-10-10", 10],
    ["2026-10-01", "2026-10-01", 1],
    ["2026-01-31", "2026-02-01", 2],
    ["2025-12-31", "2026-01-01", 2],
    ["2024-02-28", "2024-03-01", 3],
    ["2026-02-28", "2026-03-01", 2],
    ["2100-02-28", "2100-03-01", 2],
    ["2000-02-28", "2000-03-01", 3],
    ["2026-01-01", "2026-12-31", 365],
    ["2024-01-01", "2024-12-31", 366],
    ["2026-03-28", "2026-03-30", 3],
  ])("%s → %s = %i days", (entry, exit, expected) => {
    expect(calculateDays(entry, exit)).toBe(expected);
  });

  it("rejects exit before entry", () => {
    expect(() => calculateDays("2026-10-10", "2026-10-01")).toThrow("EXIT_BEFORE_ENTRY");
  });

  it.each(["2026-02-30", "2026-13-01", "2026-1-1", "2026-10-1", "26-10-01", "", "2026/10/01"])(
    "rejects invalid date %j",
    (value) => {
      expect(() => calculateDays(value, "2026-10-10")).toThrow("INVALID_DATE");
      expect(() => calculateDays("2026-10-01", value)).toThrow("INVALID_DATE");
    },
  );
});

describe("isIsoDate", () => {
  it.each([
    ["2024-02-29", true],
    ["2026-02-29", false],
    ["2100-02-29", false],
    ["0050-01-01", false],
    ["2026-10-01T00:00:00Z", false],
    [" 2026-10-01", false],
  ])("%j → %s", (value, expected) => {
    expect(isIsoDate(value)).toBe(expected);
  });
});

describe("calculateTripDays", () => {
  it("counts an open trip up to today inclusive", () => {
    expect(calculateTripDays("2026-10-01", null, "2026-10-27")).toBe(27);
  });

  it("counts a closed trip up to its exit date regardless of today", () => {
    expect(calculateTripDays("2026-10-01", "2026-10-10", "2026-10-27")).toBe(10);
  });
});

describe("calculateDaysInPeriod", () => {
  const today = "2026-10-27";
  const year2026 = { from: "2026-01-01", to: "2026-12-31" };

  it("counts a trip fully inside the period", () => {
    expect(calculateDaysInPeriod("2026-08-01", "2026-08-15", year2026, today)).toBe(15);
  });

  it("clips a trip crossing the period start", () => {
    expect(calculateDaysInPeriod("2025-12-25", "2026-01-05", year2026, today)).toBe(5);
  });

  it("clips a trip crossing the period end", () => {
    const period = { from: "2026-01-01", to: "2026-08-10" };
    expect(calculateDaysInPeriod("2026-08-01", "2026-08-15", period, today)).toBe(10);
  });

  it("returns 0 for a trip outside the period", () => {
    expect(calculateDaysInPeriod("2025-06-01", "2025-06-10", year2026, today)).toBe(0);
  });

  it("counts a single shared boundary day", () => {
    const period = { from: "2026-08-15", to: "2026-08-15" };
    expect(calculateDaysInPeriod("2026-08-01", "2026-08-15", period, today)).toBe(1);
  });

  it("ends an open trip at today when the period extends into the future", () => {
    expect(calculateDaysInPeriod("2026-10-01", null, year2026, today)).toBe(27);
  });

  it("ends an open trip at period end when it is before today", () => {
    const period = { from: "2026-01-01", to: "2026-10-10" };
    expect(calculateDaysInPeriod("2026-10-01", null, period, today)).toBe(10);
  });

  it("counts all history when from and to are null", () => {
    const allTime = { from: null, to: null };
    expect(calculateDaysInPeriod("2020-01-01", "2020-01-10", allTime, today)).toBe(10);
    expect(calculateDaysInPeriod("2026-10-01", null, allTime, today)).toBe(27);
  });

  it("returns 0 for an open trip that starts after today", () => {
    expect(calculateDaysInPeriod("2026-10-28", null, { from: null, to: null }, today)).toBe(0);
  });
});
