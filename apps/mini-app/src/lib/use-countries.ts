import { useEffect, useState } from "react";
import { api } from "./api";
import { localizeCountries, type LocalizedCountry } from "./countries";

// The reference list rarely changes, so it is loaded once per app session.
let cache: Promise<LocalizedCountry[]> | null = null;

function loadCountries(): Promise<LocalizedCountry[]> {
  cache ??= api
    .getCountries()
    .then((response) => localizeCountries(response.items))
    .catch((error: unknown) => {
      cache = null; // allow a retry on the next mount
      throw error;
    });
  return cache;
}

export type CountriesState =
  | { status: "loading" }
  | { status: "ready"; countries: LocalizedCountry[] }
  | { status: "error"; error: unknown };

export function useCountries(): CountriesState {
  const [state, setState] = useState<CountriesState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    loadCountries().then(
      (countries) => !cancelled && setState({ status: "ready", countries }),
      (error: unknown) => !cancelled && setState({ status: "error", error }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
