import { useMemo, useState } from "react";
import { countryFlag, filterCountries, type LocalizedCountry } from "../lib/countries";

interface CountryPickerProps {
  countries: readonly LocalizedCountry[];
  value: string | null;
  onChange: (code: string) => void;
}

export function CountryPicker({ countries, value, onChange }: CountryPickerProps) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => filterCountries(countries, search), [countries, search]);
  const selected = countries.find((country) => country.code === value);

  return (
    <div className="country-picker">
      <p className="field-label">Страна</p>
      {selected && (
        <p className="selected-country">
          {countryFlag(selected.code)} {selected.localName}
        </p>
      )}
      <input
        className="input"
        type="search"
        placeholder="Поиск страны"
        aria-label="Поиск страны"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <ul className="country-list" role="listbox" aria-label="Страны">
        {filtered.map((country) => (
          <li key={country.code} role="option" aria-selected={country.code === value}>
            <button
              type="button"
              className={country.code === value ? "country-option selected" : "country-option"}
              onClick={() => onChange(country.code)}
            >
              <span aria-hidden="true">{countryFlag(country.code)}</span> {country.localName}
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="hint empty">Ничего не найдено</li>}
      </ul>
    </div>
  );
}
