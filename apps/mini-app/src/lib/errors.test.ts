import { describe, expect, it } from "vitest";
import { ApiError } from "./api-client";
import { errorMessage } from "./errors";

describe("errorMessage", () => {
  it.each([
    ["OPEN_TRIP_EXISTS", "Сначала отметьте выезд из текущей страны."],
    ["TRIP_OVERLAP", "Даты пересекаются с другой поездкой."],
    ["NETWORK_ERROR", "Нет соединения с сервером. Проверьте интернет."],
  ] as const)("translates %s", (code, message) => {
    expect(errorMessage(new ApiError(code, 409, "server text"))).toBe(message);
  });

  it("does not show server or internal texts", () => {
    expect(errorMessage(new ApiError("INTERNAL_ERROR", 500, "stack trace"))).toBe(
      "Что-то пошло не так. Попробуйте ещё раз.",
    );
    expect(errorMessage(new Error("boom"))).toBe("Что-то пошло не так. Попробуйте ещё раз.");
  });
});
