import { ApiError, type ApiErrorCode } from "./api-client";

const MESSAGES: Partial<Record<ApiErrorCode, string>> = {
  OPEN_TRIP_EXISTS: "Сначала отметьте выезд из текущей страны.",
  TRIP_OVERLAP: "Даты пересекаются с другой поездкой.",
  TRIP_ALREADY_CLOSED: "Эта поездка уже закрыта.",
  TRIP_NOT_FOUND: "Поездка не найдена. Возможно, её уже удалили.",
  VALIDATION_ERROR: "Проверьте введённые данные.",
  UNAUTHORIZED: "Сессия устарела. Закройте и снова откройте приложение.",
  NETWORK_ERROR: "Нет соединения с сервером. Проверьте интернет.",
};

const FALLBACK = "Что-то пошло не так. Попробуйте ещё раз.";

/** User-facing Russian text for any error thrown by the API client. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? (MESSAGES[error.code] ?? FALLBACK) : FALLBACK;
}
