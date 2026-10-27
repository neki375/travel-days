import { createApiClient } from "./api-client";
import { getDeviceTimeZone } from "./dates";
import { getInitData } from "./telegram";

export const api = createApiClient({
  baseUrl: "/api/v1",
  getInitData,
  getTimeZone: getDeviceTimeZone,
});
