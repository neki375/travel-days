import { describe, expect, it } from "vitest";
import { barPercent, resolvePeriod } from "./statistics-period";

const today = "2026-10-27";
const noCustom = { from: "", to: "" };

describe("resolvePeriod", () => {
  it("covers the whole current calendar year", () => {
    expect(resolvePeriod("year", today, noCustom)).toEqual({
      ok: true,
      params: { from: "2026-01-01", to: "2026-12-31" },
      label: "2026 год",
    });
  });

  it("sends no bounds for all time", () => {
    expect(resolvePeriod("all", today, noCustom)).toEqual({
      ok: true,
      params: {},
      label: "За всё время",
    });
  });

  it("uses a valid custom period", () => {
    expect(resolvePeriod("custom", today, { from: "2026-08-01", to: "2026-08-15" })).toEqual({
      ok: true,
      params: { from: "2026-08-01", to: "2026-08-15" },
      label: "1 авг. 2026 г. — 15 авг. 2026 г.",
    });
  });

  it.each([
    [{ from: "", to: "2026-08-15" }, "Укажите начало и конец периода."],
    [{ from: "2026-08-01", to: "" }, "Укажите начало и конец периода."],
    [{ from: "2026-08-15", to: "2026-08-01" }, "Начало периода позже его конца."],
  ])("rejects custom period %j", (custom, error) => {
    expect(resolvePeriod("custom", today, custom)).toEqual({ ok: false, error });
  });
});

describe("barPercent", () => {
  it.each([
    [27, 27, 100],
    [15, 27, 56],
    [1, 365, 2],
    [0, 27, 0],
    [5, 0, 0],
  ])("%i of %i → %i%", (days, max, expected) => {
    expect(barPercent(days, max)).toBe(expected);
  });
});
