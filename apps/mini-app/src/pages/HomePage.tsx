import type { Trip } from "@travel-days/shared";
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { countryFlag, countryName } from "../lib/countries";
import { formatDate, formatDays } from "../lib/dates";
import { errorMessage } from "../lib/errors";

interface HomePageProps {
  onCheckIn: () => void;
  onCheckOut: (trip: Trip) => void;
}

type State =
  | { status: "loading" }
  | { status: "ready"; trip: Trip | null }
  | { status: "error"; message: string };

export function HomePage({ onCheckIn, onCheckOut }: HomePageProps) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => {
    let cancelled = false;
    api.getCurrentTrip().then(
      ({ trip }) => !cancelled && setState({ status: "ready", trip }),
      (error: unknown) => !cancelled && setState({ status: "error", message: errorMessage(error) }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelLoad = load();

    // The day counter depends on today: refresh when the app comes back to the foreground.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        cancelLoad();
        cancelLoad = load();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelLoad();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // reloadKey: the retry button changes it to load again.
  }, [load, reloadKey]);

  if (state.status === "loading") {
    return <p className="hint">Загрузка…</p>;
  }

  if (state.status === "error") {
    return (
      <div className="card">
        <p className="error">{state.message}</p>
        <button
          type="button"
          className="button secondary"
          onClick={() => {
            setState({ status: "loading" });
            setReloadKey((key) => key + 1);
          }}
        >
          Повторить
        </button>
      </div>
    );
  }

  const { trip } = state;
  if (!trip) {
    return (
      <section className="card current-trip">
        <p className="hint">Сейчас нет открытой поездки</p>
        <p>Отметьте въезд, когда пересечёте границу, и приложение начнёт считать дни.</p>
        <button type="button" className="button" onClick={onCheckIn}>
          Отметить въезд
        </button>
      </section>
    );
  }

  return (
    <section className="card current-trip">
      <p className="hint">Сейчас вы в стране</p>
      <h1 className="country-title">
        <span aria-hidden="true">{countryFlag(trip.country.code)}</span>{" "}
        {countryName(trip.country.code, trip.country.name)}
      </h1>
      <p className="day-counter">{formatDays(trip.days)}</p>
      <p className="hint">с {formatDate(trip.entryDate)}, включая день въезда</p>
      <button type="button" className="button" onClick={() => onCheckOut(trip)}>
        Отметить выезд
      </button>
    </section>
  );
}
