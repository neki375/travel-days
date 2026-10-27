import { describe, expect, it } from "vitest";
import { formatDate, formatDateRange, formatDays, localToday, startOfYear } from "./dates";

describe("formatDate", () => {
  it("formats in Russian without shifting the day", () => {
    // The test project runs with TZ=America/Los_Angeles, where new Date("2026-10-01")
    // would display as September 30.
    expect(process.env.TZ).toBe("America/Los_Angeles");
    expect(formatDate("2026-10-01")).toBe("1 октября 2026 г.");
    expect(formatDate("2026-01-01")).toBe("1 января 2026 г.");
  });
});

describe("formatDateRange", () => {
  it.each([
    ["2026-10-01", "2026-10-10", "1 окт. 2026 г. — 10 окт. 2026 г."],
    ["2026-10-01", null, "1 окт. 2026 г. — сейчас"],
    ["2026-10-01", "2026-10-01", "1 окт. 2026 г."],
  ])("%s → %s = %s", (entryDate, exitDate, expected) => {
    expect(formatDateRange(entryDate, exitDate)).toBe(expected);
  });
});

describe("localToday", () => {
  it("uses the device's local calendar date", () => {
    expect(localToday(new Date(2026, 9, 27, 23, 30))).toBe("2026-10-27");
    expect(localToday(new Date(2026, 0, 1, 0, 5))).toBe("2026-01-01");
  });
});

describe("startOfYear", () => {
  it("returns January 1 of the same year", () => {
    expect(startOfYear("2026-10-27")).toBe("2026-01-01");
  });
});

describe("formatDays", () => {
  it.each([
    [0, "0 дней"],
    [1, "1 день"],
    [2, "2 дня"],
    [4, "4 дня"],
    [5, "5 дней"],
    [11, "11 дней"],
    [21, "21 день"],
    [22, "22 дня"],
    [27, "27 дней"],
    [111, "111 дней"],
  ])("%i → %s", (days, expected) => {
    expect(formatDays(days)).toBe(expected);
  });
});
