import { useMemo, useState } from "react";
import { countryFlag, filterCountries, type LocalizedCountry } from "../lib/countries";

interface CountryPickerProps {
  countries: readonly LocalizedCountry[];
  value: string | null;
  onChange: (code: string) => void;
}

/** Search and list while choosing; collapses to the selected country once one is chosen. */
export function CountryPicker({ countries, value, onChange }: CountryPickerProps) {
  const [search, setSearch] = useState("");
  const [choosing, setChoosing] = useState(value === null);
  const filtered = useMemo(() => filterCountries(countries, search), [countries, search]);
  const selected = countries.find((country) => country.code === value);

  function select(code: string) {
    onChange(code);
    setSearch("");
    setChoosing(false);
  }

  if (selected && !choosing) {
    return (
      <div className="country-picker">
        <p className="field-label">Страна</p>
        <div className="selected-country">
          <span>
            <span aria-hidden="true">{countryFlag(selected.code)}</span> {selected.localName}
          </span>
          <button type="button" className="link-button" onClick={() => setChoosing(true)}>
            Изменить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="country-picker">
      <p className="field-label">Страна</p>
      <input
        className="input"
        type="search"
        placeholder="Поиск страны"
        aria-label="Поиск страны"
        // Focus the search when the user reopens the picker to change the country.
        autoFocus={selected !== undefined}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <ul className="country-list" role="listbox" aria-label="Страны">
        {filtered.map((country) => (
          <li key={country.code} role="option" aria-selected={country.code === value}>
            <button
              type="button"
              className={country.code === value ? "country-option selected" : "country-option"}
              onClick={() => select(country.code)}
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
