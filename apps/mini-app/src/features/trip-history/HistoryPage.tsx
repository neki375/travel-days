import type { Trip } from "@travel-days/shared";
import { useEffect, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { api } from "../../lib/api";
import { countryFlag, countryName } from "../../lib/countries";
import { formatDateRange, formatDays } from "../../lib/dates";
import { errorMessage } from "../../lib/errors";

interface HistoryPageProps {
  onSelect: (trip: Trip) => void;
  onAdd: () => void;
  onBack: () => void;
}

const PAGE_SIZE = 30;

export function HistoryPage({ onSelect, onAdd, onBack }: HistoryPageProps) {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.listTrips({ limit: PAGE_SIZE }).then(
      (page) => {
        if (!cancelled) {
          setTrips(page.items);
          setNextCursor(page.nextCursor);
        }
      },
      (loadError: unknown) => !cancelled && setError(errorMessage(loadError)),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadMore() {
    if (!nextCursor) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await api.listTrips({ limit: PAGE_SIZE, cursor: nextCursor });
      setTrips((current) => [...(current ?? []), ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <>
      <PageHeader title="История поездок" onBack={onBack} />
      <button type="button" className="button secondary add-trip" onClick={onAdd}>
        + Добавить прошлую поездку
      </button>

      {error && <p className="error card">{error}</p>}
      {!trips && !error && <p className="hint">Загрузка…</p>}
      {trips?.length === 0 && <p className="hint card">Поездок пока нет.</p>}

      {trips && trips.length > 0 && (
        <ul className="card trip-list">
          {trips.map((trip) => (
            <li key={trip.id}>
              <button type="button" className="trip-row" onClick={() => onSelect(trip)}>
                <span className="trip-country">
                  <span aria-hidden="true">{countryFlag(trip.country.code)}</span>{" "}
                  {countryName(trip.country.code, trip.country.name)}
                </span>
                <span className="trip-days">{formatDays(trip.days)}</span>
                <span className="hint trip-dates">
                  {formatDateRange(trip.entryDate, trip.exitDate)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {nextCursor && (
        <button
          type="button"
          className="button secondary"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? "Загрузка…" : "Показать ещё"}
        </button>
      )}
    </>
  );
}
