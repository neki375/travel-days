import { useState, type FormEvent, type ReactNode } from "react";
import { CountryPicker } from "../../components/CountryPicker";
import { localToday } from "../../lib/dates";
import { errorMessage } from "../../lib/errors";
import type { TripValues } from "../../lib/trip-changes";
import { MIN_TRIP_DATE, validateTrip } from "../../lib/trip-validation";
import { notifyHaptic } from "../../lib/telegram";
import { useCountries } from "../../lib/use-countries";

interface TripFormProps {
  initial: { countryCode: string | null; entryDate: string; exitDate: string | null };
  submitLabel: string;
  /** Resolves when saved; a rejection is shown as the form error. */
  onSubmit: (values: TripValues) => Promise<void>;
  /** Extra actions under the submit button, e.g. delete. */
  children?: ReactNode;
}

export function TripForm({ initial, submitLabel, onSubmit, children }: TripFormProps) {
  const countries = useCountries();
  const today = localToday();
  const [countryCode, setCountryCode] = useState(initial.countryCode);
  const [entryDate, setEntryDate] = useState(initial.entryDate);
  const [ongoing, setOngoing] = useState(initial.exitDate === null);
  const [exitDate, setExitDate] = useState(initial.exitDate ?? today);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const values = { countryCode, entryDate, exitDate: ongoing ? null : exitDate };
    const validationError = validateTrip(values, today);
    if (validationError || !values.countryCode) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit({ ...values, countryCode: values.countryCode });
      notifyHaptic("success");
    } catch (error) {
      notifyHaptic("error");
      setFormError(errorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <form className="card form" onSubmit={(event) => void handleSubmit(event)}>
      {countries.status === "loading" && <p className="hint">Загрузка стран…</p>}
      {countries.status === "error" && <p className="error">{errorMessage(countries.error)}</p>}
      {countries.status === "ready" && (
        <CountryPicker
          countries={countries.countries}
          value={countryCode}
          onChange={setCountryCode}
        />
      )}

      <label className="field">
        <span className="field-label">Дата въезда</span>
        <input
          className="input"
          type="date"
          required
          min={MIN_TRIP_DATE}
          max={today}
          value={entryDate}
          onChange={(event) => setEntryDate(event.target.value)}
        />
      </label>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={ongoing}
          onChange={(event) => setOngoing(event.target.checked)}
        />
        Поездка ещё продолжается
      </label>

      {!ongoing && (
        <label className="field">
          <span className="field-label">Дата выезда</span>
          <input
            className="input"
            type="date"
            required
            min={entryDate || MIN_TRIP_DATE}
            max={today}
            value={exitDate}
            onChange={(event) => setExitDate(event.target.value)}
          />
        </label>
      )}

      {formError && (
        <p className="error" role="alert">
          {formError}
        </p>
      )}
      <button className="button" type="submit" disabled={submitting}>
        {submitting ? "Сохраняем…" : submitLabel}
      </button>
      {children}
    </form>
  );
}
