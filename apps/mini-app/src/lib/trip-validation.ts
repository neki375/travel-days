/**
 * Client-side form checks mirroring SPEC.md §10.3, for immediate feedback.
 * The server repeats every check; `today` here is the device's local date.
 */

export const MIN_TRIP_DATE = "1900-01-01";

export function validateEntry(
  countryCode: string | null,
  entryDate: string,
  today: string,
): string | null {
  if (!countryCode) {
    return "Выберите страну.";
  }
  return validateDate(entryDate, today, "въезда");
}

export function validateExit(exitDate: string, entryDate: string, today: string): string | null {
  const dateError = validateDate(exitDate, today, "выезда");
  if (dateError) {
    return dateError;
  }
  if (exitDate < entryDate) {
    return "Дата выезда не может быть раньше даты въезда.";
  }
  return null;
}

function validateDate(date: string, today: string, kind: "въезда" | "выезда"): string | null {
  if (!date) {
    return `Укажите дату ${kind}.`;
  }
  if (date < MIN_TRIP_DATE) {
    return "Даты раньше 1900 года не поддерживаются.";
  }
  if (date > today) {
    return `Дата ${kind} не может быть в будущем.`;
  }
  return null;
}
