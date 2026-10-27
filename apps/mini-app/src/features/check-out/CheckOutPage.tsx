import type { Trip } from "@travel-days/shared";
import { useState, type FormEvent } from "react";
import { PageHeader } from "../../components/PageHeader";
import { api } from "../../lib/api";
import { countryFlag, countryName } from "../../lib/countries";
import { formatDate, localToday } from "../../lib/dates";
import { errorMessage } from "../../lib/errors";
import { notifyHaptic } from "../../lib/telegram";
import { validateExit } from "../../lib/trip-validation";

interface CheckOutPageProps {
  trip: Trip;
  onDone: () => void;
  onBack: () => void;
}

export function CheckOutPage({ trip, onDone, onBack }: CheckOutPageProps) {
  const today = localToday();
  const [exitDate, setExitDate] = useState(today);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validateExit(exitDate, trip.entryDate, today);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await api.checkout(trip.id, exitDate);
      notifyHaptic("success");
      onDone();
    } catch (error) {
      notifyHaptic("error");
      setFormError(errorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="Выезд из страны" onBack={onBack} />
      <form className="card form" onSubmit={(event) => void handleSubmit(event)}>
        <p>
          {countryFlag(trip.country.code)} {countryName(trip.country.code, trip.country.name)}
          <br />
          <span className="hint">въезд {formatDate(trip.entryDate)}</span>
        </p>

        <label className="field">
          <span className="field-label">Дата выезда</span>
          <input
            className="input"
            type="date"
            required
            min={trip.entryDate}
            max={today}
            value={exitDate}
            onChange={(event) => setExitDate(event.target.value)}
          />
        </label>
        <p className="hint">День выезда тоже засчитывается как день в стране.</p>

        {formError && (
          <p className="error" role="alert">
            {formError}
          </p>
        )}
        <button className="button" type="submit" disabled={submitting}>
          {submitting ? "Сохраняем…" : "Отметить выезд"}
        </button>
      </form>
    </>
  );
}
