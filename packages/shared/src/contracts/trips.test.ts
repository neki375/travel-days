import { describe, expect, it } from "vitest";
import { checkoutTripBodySchema, createTripBodySchema, isoDateSchema } from "./trips";

describe("isoDateSchema", () => {
  it.each([
    ["2026-10-01", true],
    ["2024-02-29", true],
    ["2000-02-29", true],
    ["2026-02-29", false],
    ["2100-02-29", false],
    ["2026-04-31", false],
    ["2026-1-1", false],
    ["2026-10-01T00:00:00Z", false],
    ["", false],
  ])("%j → %s", (value, valid) => {
    expect(isoDateSchema.safeParse(value).success).toBe(valid);
  });
});

describe("createTripBodySchema", () => {
  it("accepts an open trip with or without explicit null exitDate", () => {
    expect(createTripBodySchema.parse({ countryCode: "PH", entryDate: "2026-10-01" })).toEqual({
      countryCode: "PH",
      entryDate: "2026-10-01",
    });
    expect(
      createTripBodySchema.parse({ countryCode: "PH", entryDate: "2026-10-01", exitDate: null }),
    ).toMatchObject({ exitDate: null });
  });

  it.each([
    ["lowercase country", { countryCode: "ph", entryDate: "2026-10-01" }],
    ["three-letter country", { countryCode: "PHL", entryDate: "2026-10-01" }],
    ["missing entry date", { countryCode: "PH" }],
    ["user id", { countryCode: "PH", entryDate: "2026-10-01", userId: "x" }],
    ["numeric date", { countryCode: "PH", entryDate: 20261001 }],
  ])("rejects %s", (_name, body) => {
    expect(createTripBodySchema.safeParse(body).success).toBe(false);
  });
});

describe("checkoutTripBodySchema", () => {
  it("requires exitDate", () => {
    expect(checkoutTripBodySchema.safeParse({}).success).toBe(false);
    expect(checkoutTripBodySchema.safeParse({ exitDate: null }).success).toBe(false);
  });
});
