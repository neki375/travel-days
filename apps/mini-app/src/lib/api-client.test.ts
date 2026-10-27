import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "./api-client";

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function setup(response: Response | Error) {
  const fetchMock = vi.fn<typeof fetch>(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  const client = createApiClient({
    baseUrl: "/api/v1",
    getInitData: () => "query_id=1&hash=abc",
    getTimeZone: () => "Asia/Manila",
    fetch: fetchMock,
  });
  return { client, fetchMock };
}

function lastCall(fetchMock: ReturnType<typeof setup>["fetchMock"]) {
  const [url, init] = fetchMock.mock.lastCall!;
  return { url, init: init!, headers: init!.headers as Record<string, string> };
}

describe("api client", () => {
  it("sends Telegram authorization and the device time zone", async () => {
    const { client, fetchMock } = setup(jsonResponse(200, { trip: null }));

    await expect(client.getCurrentTrip()).resolves.toEqual({ trip: null });

    const { url, init, headers } = lastCall(fetchMock);
    expect(url).toBe("/api/v1/trips/current");
    expect(init.method).toBe("GET");
    expect(headers).toEqual({
      authorization: "tma query_id=1&hash=abc",
      "x-timezone": "Asia/Manila",
    });
  });

  it("sends JSON bodies", async () => {
    const { client, fetchMock } = setup(jsonResponse(201, { id: "1" }));

    await client.createTrip({ countryCode: "PH", entryDate: "2026-10-01" });

    const { init, headers } = lastCall(fetchMock);
    expect(init.method).toBe("POST");
    expect(headers["content-type"]).toBe("application/json");
    expect(init.body).toBe('{"countryCode":"PH","entryDate":"2026-10-01"}');
  });

  it("builds query strings and skips empty values", async () => {
    const { client, fetchMock } = setup(jsonResponse(200, { items: [], nextCursor: null }));

    await client.listTrips({ from: "2026-01-01", country: "", limit: 20 });

    expect(lastCall(fetchMock).url).toBe("/api/v1/trips?from=2026-01-01&limit=20");
  });

  it("encodes path parameters", async () => {
    const { client, fetchMock } = setup(jsonResponse(200, {}));

    await client.checkout("a/b", "2026-10-10");

    expect(lastCall(fetchMock).url).toBe("/api/v1/trips/a%2Fb/checkout");
  });

  it("resolves 204 responses with undefined", async () => {
    const { client } = setup(new Response(null, { status: 204 }));

    await expect(client.deleteTrip("1")).resolves.toBeUndefined();
  });

  it("turns the unified error body into ApiError", async () => {
    const { client } = setup(
      jsonResponse(409, { error: { code: "TRIP_OVERLAP", message: "Trip dates overlap" } }),
    );

    const error = await client
      .createTrip({ countryCode: "PH", entryDate: "2026-10-01" })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "TRIP_OVERLAP", status: 409 });
  });

  it("reports a non-JSON error response as INTERNAL_ERROR", async () => {
    const { client } = setup(new Response("<html>Bad gateway</html>", { status: 502 }));

    await expect(client.getCountries()).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      status: 502,
    });
  });

  it("reports a failed request as NETWORK_ERROR", async () => {
    const { client } = setup(new TypeError("Failed to fetch"));

    await expect(client.getCountries()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});
