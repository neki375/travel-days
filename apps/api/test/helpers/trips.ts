import type { FastifyInstance } from "fastify";
import { authHeaders } from "./app";

export interface RequestAs {
  telegramId?: number;
  timeZone?: string;
}

function headers({ telegramId = 1001, timeZone }: RequestAs) {
  return { ...authHeaders(telegramId), ...(timeZone ? { "x-timezone": timeZone } : {}) };
}

export function postTrip(app: FastifyInstance, body: unknown, as: RequestAs = {}) {
  return app.inject({
    method: "POST",
    url: "/api/v1/trips",
    headers: headers(as),
    payload: body as object,
  });
}

export function postCheckout(
  app: FastifyInstance,
  tripId: string,
  body: unknown,
  as: RequestAs = {},
) {
  return app.inject({
    method: "POST",
    url: `/api/v1/trips/${tripId}/checkout`,
    headers: headers(as),
    payload: body as object,
  });
}

/** Creates a trip through the API and returns its id; fails the test on a non-201 response. */
export async function createTrip(
  app: FastifyInstance,
  countryCode: string,
  entryDate: string,
  exitDate: string | null = null,
  as: RequestAs = {},
): Promise<string> {
  const response = await postTrip(app, { countryCode, entryDate, exitDate }, as);
  if (response.statusCode !== 201) {
    throw new Error(`Expected 201, got ${response.statusCode}: ${response.body}`);
  }
  return response.json<{ id: string }>().id;
}
