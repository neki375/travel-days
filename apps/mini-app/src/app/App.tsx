import type { CurrentTripResponse } from "@travel-days/shared";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { ApiError } from "../lib/api-client";
import { countryFlag, countryName } from "../lib/countries";
import { formatDate, formatDays } from "../lib/dates";
import { getInitData } from "../lib/telegram";

type State =
  | { status: "loading" }
  | { status: "ready"; data: CurrentTripResponse }
  | { status: "error"; message: string };

export function App() {
  const hasInitData = getInitData() !== "";
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!hasInitData) {
      return;
    }
    let cancelled = false;
    api
      .getCurrentTrip()
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch(
        (error: unknown) => !cancelled && setState({ status: "error", message: errorText(error) }),
      );
    return () => {
      cancelled = true;
    };
  }, [hasInitData]);

  if (!hasInitData) {
    return (
      <div className="card">
        <h1>Travel Days</h1>
        <p className="hint">Откройте приложение через Telegram-бота.</p>
      </div>
    );
  }

  if (state.status === "loading") {
    return <p className="hint">Загрузка…</p>;
  }

  if (state.status === "error") {
    return (
      <div className="card">
        <p className="error">{state.message}</p>
      </div>
    );
  }

  const { trip } = state.data;
  return (
    <div className="card">
      <h1>Travel Days</h1>
      {trip ? (
        <p>
          {countryFlag(trip.country.code)} {countryName(trip.country.code, trip.country.name)}:{" "}
          {formatDays(trip.days)} с {formatDate(trip.entryDate)}
        </p>
      ) : (
        <p className="hint">Сейчас нет открытой поездки.</p>
      )}
    </div>
  );
}

function errorText(error: unknown): string {
  if (error instanceof ApiError && error.code === "UNAUTHORIZED") {
    return "Сессия устарела. Закройте и снова откройте приложение.";
  }
  if (error instanceof ApiError && error.code === "NETWORK_ERROR") {
    return "Нет соединения с сервером.";
  }
  return "Что-то пошло не так. Попробуйте ещё раз.";
}
