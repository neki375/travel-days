import { describe, expect, it } from "vitest";
import { validateEntry, validateExit, validateTrip } from "./trip-validation";

const today = "2026-10-27";

describe("validateEntry", () => {
  it.each([
    ["PH", "2026-10-27", null],
    ["PH", "2026-10-01", null],
    [null, "2026-10-01", "Выберите страну."],
    ["PH", "", "Укажите дату въезда."],
    ["PH", "2026-10-28", "Дата въезда не может быть в будущем."],
    ["PH", "1899-12-31", "Даты раньше 1900 года не поддерживаются."],
  ])("%s %j → %s", (countryCode, entryDate, expected) => {
    expect(validateEntry(countryCode, entryDate, today)).toBe(expected);
  });
});

describe("validateTrip", () => {
  it.each([
    [{ countryCode: "PH", entryDate: "2026-10-01", exitDate: null }, null],
    [{ countryCode: "PH", entryDate: "2026-10-01", exitDate: "2026-10-05" }, null],
    [{ countryCode: null, entryDate: "2026-10-01", exitDate: null }, "Выберите страну."],
    [
      { countryCode: "PH", entryDate: "2026-10-05", exitDate: "2026-10-01" },
      "Дата выезда не может быть раньше даты въезда.",
    ],
    [{ countryCode: "PH", entryDate: "2026-10-01", exitDate: "" }, "Укажите дату выезда."],
  ])("%j → %s", (values, expected) => {
    expect(validateTrip(values, today)).toBe(expected);
  });
});

describe("validateExit", () => {
  const entryDate = "2026-10-01";

  it.each([
    ["2026-10-01", null],
    ["2026-10-27", null],
    ["", "Укажите дату выезда."],
    ["2026-09-30", "Дата выезда не может быть раньше даты въезда."],
    ["2026-10-28", "Дата выезда не может быть в будущем."],
  ])("%j → %s", (exitDate, expected) => {
    expect(validateExit(exitDate, entryDate, today)).toBe(expected);
  });
});
