import type {
  ApiErrorBody,
  CreateTripInput,
  CurrentTripResponse,
  ErrorCode,
  ListCountriesResponse,
  ListTripsResponse,
  StatisticsResponse,
  Trip,
  UpdateTripInput,
} from "@travel-days/shared";

export type ApiErrorCode = ErrorCode | "NETWORK_ERROR";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  getInitData: () => string;
  getTimeZone: () => string;
  fetch?: typeof fetch;
}

export interface TripsListParams {
  from?: string;
  to?: string;
  country?: string;
  limit?: number;
  cursor?: string;
}

export interface StatisticsParams {
  from?: string;
  to?: string;
}

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient(options: ApiClientOptions) {
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      authorization: `tma ${options.getInitData()}`,
      "x-timezone": options.getTimeZone(),
    };
    if (body !== undefined) {
      headers["content-type"] = "application/json";
    }

    let response: Response;
    try {
      response = await fetchImpl(`${options.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? null : JSON.stringify(body),
      });
    } catch {
      throw new ApiError("NETWORK_ERROR", 0, "Network request failed");
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw toApiError(response.status, payload);
    }
    return payload as T;
  }

  return {
    getCountries: () => request<ListCountriesResponse>("GET", "/countries"),
    getCurrentTrip: () => request<CurrentTripResponse>("GET", "/trips/current"),
    listTrips: (params: TripsListParams = {}) =>
      request<ListTripsResponse>("GET", `/trips${toQuery({ ...params })}`),
    createTrip: (input: CreateTripInput) => request<Trip>("POST", "/trips", input),
    checkout: (tripId: string, exitDate: string) =>
      request<Trip>("POST", `/trips/${encodeURIComponent(tripId)}/checkout`, { exitDate }),
    updateTrip: (tripId: string, input: UpdateTripInput) =>
      request<Trip>("PATCH", `/trips/${encodeURIComponent(tripId)}`, input),
    deleteTrip: (tripId: string) =>
      request<undefined>("DELETE", `/trips/${encodeURIComponent(tripId)}`),
    getStatistics: (params: StatisticsParams = {}) =>
      request<StatisticsResponse>("GET", `/statistics${toQuery({ ...params })}`),
  };
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

function toApiError(status: number, payload: unknown): ApiError {
  const error = (payload as Partial<ApiErrorBody> | undefined)?.error;
  if (error && typeof error.code === "string" && typeof error.message === "string") {
    return new ApiError(error.code, status, error.message);
  }
  return new ApiError("INTERNAL_ERROR", status, `Unexpected response with status ${status}`);
}
