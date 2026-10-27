import { useState, type FormEvent } from "react";
import { CountryPicker } from "../../components/CountryPicker";
import { PageHeader } from "../../components/PageHeader";
import { api } from "../../lib/api";
import { localToday } from "../../lib/dates";
import { errorMessage } from "../../lib/errors";
import { notifyHaptic } from "../../lib/telegram";
import { MIN_TRIP_DATE, validateEntry } from "../../lib/trip-validation";
import { useCountries } from "../../lib/use-countries";

interface CheckInPageProps {
  onDone: () => void;
  onBack: () => void;
}

export function CheckInPage({ onDone, onBack }: CheckInPageProps) {
  const countries = useCountries();
  const today = localToday();
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState(today);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validateEntry(countryCode, entryDate, today);
    if (validationError || !countryCode) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await api.createTrip({ countryCode, entryDate });
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
      <PageHeader title="Въезд в страну" onBack={onBack} />
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

        {formError && (
          <p className="error" role="alert">
            {formError}
          </p>
        )}
        <button className="button" type="submit" disabled={submitting}>
          {submitting ? "Сохраняем…" : "Отметить въезд"}
        </button>
      </form>
    </>
  );
}
