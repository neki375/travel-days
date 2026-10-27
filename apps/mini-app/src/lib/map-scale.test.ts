import { describe, expect, it } from "vitest";
import { binCountries, binSummary, countByBin, dayBin, formatCountryCount } from "./map-scale";

describe("dayBin", () => {
  it.each([
    [0, 0],
    [1, 1],
    [7, 1],
    [8, 2],
    [30, 2],
    [31, 3],
    [90, 3],
    [91, 4],
    [400, 4],
  ])("%i days → step %i", (days, bin) => {
    expect(dayBin(days)).toBe(bin);
  });
});

describe("countByBin", () => {
  it("counts visited countries per step and the rest as not visited", () => {
    const countries = [{ days: 120 }, { days: 45 }, { days: 27 }, { days: 9 }, { days: 3 }];

    expect(countByBin(countries, 250)).toEqual([245, 1, 2, 1, 1]);
  });

  it("treats every country as not visited without trips", () => {
    expect(countByBin([], 250)).toEqual([250, 0, 0, 0, 0]);
  });
});

describe("formatCountryCount", () => {
  it.each([
    [1, "1 страна"],
    [3, "3 страны"],
    [5, "5 стран"],
    [11, "11 стран"],
    [21, "21 страна"],
    [242, "242 страны"],
    [245, "245 стран"],
  ])("%i → %s", (count, expected) => {
    expect(formatCountryCount(count)).toBe(expected);
  });
});

describe("binSummary", () => {
  it("describes a day step and the not-visited step", () => {
    expect(binSummary(2, 3)).toBe("8–30 дней: 3 страны");
    expect(binSummary(4, 1)).toBe("91+ дней: 1 страна");
    expect(binSummary(0, 245)).toBe("Не были: 245 стран");
  });
});

describe("binCountries", () => {
  it("lists up to five names in full", () => {
    expect(binCountries(1, ["Таиланд"])).toBe("1–7 дней: Таиланд");
    expect(binCountries(2, ["А", "Б", "В", "Г", "Д"])).toBe("8–30 дней: А, Б, В, Г, Д");
  });

  it("shortens longer lists with the number of the rest", () => {
    expect(binCountries(3, ["А", "Б", "В", "Г", "Д", "Е"])).toBe("31–90 дней: А, Б, В, Г и ещё 2");
  });

  it("falls back to the count for an empty step", () => {
    expect(binCountries(4, [])).toBe("91+ дней: 0 стран");
  });
});
