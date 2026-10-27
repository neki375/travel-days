import { describe, expect, it } from "vitest";
import { decodeTripsCursor, encodeTripsCursor } from "./trips.cursor";

const cursor = { entryDate: "2026-10-01", id: "8f4a8a1b-8b2a-4d3a-a4c4-4f90f9f5a111" };

describe("trips cursor", () => {
  it("round-trips", () => {
    expect(decodeTripsCursor(encodeTripsCursor(cursor))).toEqual(cursor);
  });

  it("is URL-safe", () => {
    expect(encodeTripsCursor(cursor)).toMatch(/^[\w-]+$/);
  });

  it.each([
    ["garbage", "not-a-cursor"],
    ["empty", ""],
    ["JSON object", Buffer.from('{"entryDate":"2026-10-01"}').toString("base64url")],
    [
      "invalid date",
      Buffer.from('["2026-13-01","8f4a8a1b-8b2a-4d3a-a4c4-4f90f9f5a111"]').toString("base64url"),
    ],
    ["invalid id", Buffer.from('["2026-10-01","1; DROP TABLE trips"]').toString("base64url")],
    ["extra items", Buffer.from(`["2026-10-01","${cursor.id}",1]`).toString("base64url")],
  ])("rejects %s", (_name, value) => {
    expect(decodeTripsCursor(value)).toBeNull();
  });
});
