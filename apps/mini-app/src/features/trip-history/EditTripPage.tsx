import type { Trip } from "@travel-days/shared";
import { useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { api } from "../../lib/api";
import { errorMessage } from "../../lib/errors";
import { confirmAction, notifyHaptic } from "../../lib/telegram";
import { buildTripChanges } from "../../lib/trip-changes";
import { TripForm } from "./TripForm";

interface EditTripPageProps {
  trip: Trip;
  onDone: () => void;
  onBack: () => void;
}

export function EditTripPage({ trip, onDone, onBack }: EditTripPageProps) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!(await confirmAction("Удалить поездку? Статистика пересчитается."))) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteTrip(trip.id);
      notifyHaptic("success");
      onDone();
    } catch (error) {
      notifyHaptic("error");
      setDeleteError(errorMessage(error));
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader title="Поездка" onBack={onBack} />
      <TripForm
        initial={{
          countryCode: trip.country.code,
          entryDate: trip.entryDate,
          exitDate: trip.exitDate,
        }}
        submitLabel="Сохранить"
        onSubmit={async (values) => {
          const changes = buildTripChanges(trip, values);
          if (changes) {
            await api.updateTrip(trip.id, changes);
          }
          onDone();
        }}
      >
        {deleteError && (
          <p className="error" role="alert">
            {deleteError}
          </p>
        )}
        <button
          type="button"
          className="button destructive"
          disabled={deleting}
          onClick={() => void handleDelete()}
        >
          {deleting ? "Удаляем…" : "Удалить поездку"}
        </button>
      </TripForm>
    </>
  );
}
