import { describe, expect, it } from "vitest";
import { dayBin } from "./map-scale";

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
