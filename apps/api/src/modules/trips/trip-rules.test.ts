import { describe, expect, it } from "vitest";
import { findConflict, spansConflict, validateTripDates, type DateSpan } from "./trip-rules";

const span = (entryDate: string, exitDate: string | null): DateSpan => ({ entryDate, exitDate });

describe("spansConflict", () => {
  it.each([
    ["disjoint", span("2026-08-01", "2026-08-15"), span("2026-09-01", "2026-09-10"), false],
    [
      "shared boundary day",
      span("2026-10-01", "2026-10-10"),
      span("2026-10-10", "2026-10-20"),
      false,
    ],
    [
      "overlap by one inner day",
      span("2026-10-01", "2026-10-10"),
      span("2026-10-09", "2026-10-20"),
      true,
    ],
    ["identical", span("2026-10-01", "2026-10-10"), span("2026-10-01", "2026-10-10"), true],
    ["contained", span("2026-10-01", "2026-10-31"), span("2026-10-05", "2026-10-08"), true],
    ["same entry date", span("2026-10-01", "2026-10-05"), span("2026-10-01", "2026-10-10"), true],
    [
      "one-day trip on a boundary",
      span("2026-10-10", "2026-10-10"),
      span("2026-10-10", "2026-10-20"),
      false,
    ],
    [
      "one-day trip at the end",
      span("2026-10-01", "2026-10-10"),
      span("2026-10-10", "2026-10-10"),
      false,
    ],
    [
      "one-day trip inside",
      span("2026-10-01", "2026-10-10"),
      span("2026-10-05", "2026-10-05"),
      true,
    ],
    [
      "two one-day trips on the same day",
      span("2026-10-10", "2026-10-10"),
      span("2026-10-10", "2026-10-10"),
      false,
    ],
    ["two open trips", span("2026-10-01", null), span("2026-10-05", null), true],
    [
      "closed trip ending at open trip entry",
      span("2026-09-20", "2026-10-01"),
      span("2026-10-01", null),
      false,
    ],
    [
      "closed trip after open trip entry",
      span("2026-10-01", null),
      span("2026-10-05", "2026-10-08"),
      true,
    ],
    [
      "closed trip spanning open trip entry",
      span("2026-09-20", "2026-10-02"),
      span("2026-10-01", null),
      true,
    ],
    [
      "one-day trip on open trip entry",
      span("2026-10-01", "2026-10-01"),
      span("2026-10-01", null),
      false,
    ],
  ])("%s → %s", (_name, a, b, expected) => {
    expect(spansConflict(a, b)).toBe(expected);
    expect(spansConflict(b, a)).toBe(expected);
  });

  it("allows transit through a country within one day", () => {
    const trips = [span("2026-10-01", "2026-10-10"), span("2026-10-10", "2026-10-10")];
    expect(findConflict(span("2026-10-10", "2026-10-20"), trips)).toBeUndefined();
  });
});

describe("findConflict", () => {
  it("returns the first conflicting trip", () => {
    const trips = [
      { id: "a", ...span("2026-08-01", "2026-08-15") },
      { id: "b", ...span("2026-09-01", "2026-09-10") },
    ];

    expect(findConflict(span("2026-09-05", "2026-09-20"), trips)?.id).toBe("b");
  });

  it("returns undefined when there are no conflicts", () => {
    expect(findConflict(span("2026-10-01", null), [])).toBeUndefined();
  });
});

describe("validateTripDates", () => {
  const today = "2026-10-27";

  it.each([
    [span("2026-10-01", null), null],
    [span("2026-10-01", "2026-10-27"), null],
    [span("2026-10-27", "2026-10-27"), null],
    [span("1900-01-01", "1900-01-02"), null],
    [span("2026-02-30", null), "INVALID_DATE"],
    [span("2026-10-01", "2026-10-32"), "INVALID_DATE"],
    [span("1899-12-31", "1900-01-02"), "DATE_TOO_EARLY"],
    [span("2026-10-28", null), "ENTRY_IN_FUTURE"],
    [span("2026-10-01", "2026-10-28"), "EXIT_IN_FUTURE"],
    [span("2026-10-10", "2026-10-01"), "EXIT_BEFORE_ENTRY"],
  ] as const)("%j → %s", (input, expected) => {
    expect(validateTripDates(input, today)).toBe(expected);
  });
});
