import type { StatisticsResponse } from "@travel-days/shared";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { api } from "../../lib/api";
import { countryFlag, countryName } from "../../lib/countries";
import { formatDays, localToday } from "../../lib/dates";
import { errorMessage } from "../../lib/errors";
import {
  barPercent,
  resolvePeriod,
  type CustomPeriod,
  type PeriodPreset,
} from "../../lib/statistics-period";

interface StatisticsPageProps {
  onBack: () => void;
}

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "year", label: "Этот год" },
  { value: "all", label: "Всё время" },
  { value: "custom", label: "Период" },
];

type Result =
  | { key: string; status: "ready"; data: StatisticsResponse }
  | { key: string; status: "error"; message: string };

export function StatisticsPage({ onBack }: StatisticsPageProps) {
  const today = localToday();
  const [preset, setPreset] = useState<PeriodPreset>("year");
  const [custom, setCustom] = useState<CustomPeriod>({ from: "", to: today });
  const period = useMemo(() => resolvePeriod(preset, today, custom), [preset, today, custom]);
  const requestKey = period.ok ? JSON.stringify(period.params) : null;
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!period.ok || requestKey === null) {
      return;
    }
    let cancelled = false;
    api.getStatistics(period.params).then(
      (data) => !cancelled && setResult({ key: requestKey, status: "ready", data }),
      (error: unknown) =>
        !cancelled && setResult({ key: requestKey, status: "error", message: errorMessage(error) }),
    );
    return () => {
      cancelled = true;
    };
    // period.params is fully described by requestKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const current = result?.key === requestKey ? result : null;

  return (
    <>
      <PageHeader title="Статистика" onBack={onBack} />

      <div className="segmented" role="group" aria-label="Период">
        {PRESETS.map((item) => (
          <button
            key={item.value}
            type="button"
            className="segment"
            aria-pressed={preset === item.value}
            onClick={() => setPreset(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="card period-fields">
          <label className="field">
            <span className="field-label">С</span>
            <input
              className="input"
              type="date"
              value={custom.from}
              onChange={(event) => setCustom({ ...custom, from: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">По</span>
            <input
              className="input"
              type="date"
              value={custom.to}
              onChange={(event) => setCustom({ ...custom, to: event.target.value })}
            />
          </label>
        </div>
      )}

      {!period.ok && <p className="hint card">{period.error}</p>}
      {period.ok && !current && <p className="hint">Загрузка…</p>}
      {current?.status === "error" && <p className="error card">{current.message}</p>}
      {period.ok && current?.status === "ready" && (
        <StatisticsView label={period.label} data={current.data} />
      )}
    </>
  );
}

function StatisticsView({ label, data }: { label: string; data: StatisticsResponse }) {
  if (data.countries.length === 0) {
    return (
      <section className="card">
        <p className="hint">{label}</p>
        <p>За этот период поездок нет.</p>
      </section>
    );
  }

  const maxDays = data.countries[0]?.days ?? 0;
  return (
    <>
      <section className="card stats-summary">
        <p className="hint">{label}</p>
        <p className="stats-total">{formatDays(data.totalCountryDays)}</p>
        <p className="hint">
          в {data.countries.length} {data.countries.length === 1 ? "стране" : "странах"}
        </p>
      </section>

      <ul className="card stats-list" aria-label="Дни по странам">
        {data.countries.map((item) => (
          <li key={item.countryCode} className="stats-row">
            <span className="stats-country">
              <span aria-hidden="true">{countryFlag(item.countryCode)}</span>{" "}
              {countryName(item.countryCode)}
            </span>
            <span className="stats-days">{formatDays(item.days)}</span>
            <span className="stats-bar" aria-hidden="true">
              <span style={{ width: `${barPercent(item.days, maxDays)}%` }} />
            </span>
          </li>
        ))}
      </ul>

      {data.countries.length > 1 && (
        <p className="hint stats-note">
          День переезда засчитывается обеим странам, поэтому сумма может быть больше числа дней в
          периоде.
        </p>
      )}
    </>
  );
}
