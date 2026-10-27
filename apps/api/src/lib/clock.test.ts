import { describe, expect, it } from "vitest";
import { isValidTimeZone, todayInTimeZone } from "./clock";

describe("todayInTimeZone", () => {
  // 2026-10-27 20:30 UTC
  const now = new Date("2026-10-27T20:30:00Z");

  it.each([
    ["UTC", "2026-10-27"],
    ["Asia/Manila", "2026-10-28"],
    ["Pacific/Kiritimati", "2026-10-28"],
    ["America/Los_Angeles", "2026-10-27"],
    ["Pacific/Pago_Pago", "2026-10-27"],
  ])("%s → %s", (timeZone, expected) => {
    expect(todayInTimeZone(timeZone, now)).toBe(expected);
  });

  it("handles a year boundary", () => {
    const newYearEveUtc = new Date("2026-12-31T23:00:00Z");

    expect(todayInTimeZone("UTC", newYearEveUtc)).toBe("2026-12-31");
    expect(todayInTimeZone("Europe/Moscow", newYearEveUtc)).toBe("2027-01-01");
  });

  it("is not affected by the process time zone", () => {
    const original = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      expect(todayInTimeZone("Asia/Manila", now)).toBe("2026-10-28");
    } finally {
      if (original === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = original;
      }
    }
  });
});

describe("isValidTimeZone", () => {
  it.each([
    ["UTC", true],
    ["Asia/Manila", true],
    ["Not/AZone", false],
    ["", false],
  ])("%j → %s", (timeZone, expected) => {
    expect(isValidTimeZone(timeZone)).toBe(expected);
  });
});
