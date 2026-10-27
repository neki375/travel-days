import { PageHeader } from "../../components/PageHeader";
import { api } from "../../lib/api";
import { TripForm } from "./TripForm";

interface AddTripPageProps {
  onDone: () => void;
  onBack: () => void;
}

/** Adds a past trip; allowed even while another trip is open (SPEC.md §10.5). */
export function AddTripPage({ onDone, onBack }: AddTripPageProps) {
  return (
    <>
      <PageHeader title="Прошлая поездка" onBack={onBack} />
      <TripForm
        initial={{ countryCode: null, entryDate: "", exitDate: "" }}
        submitLabel="Добавить поездку"
        onSubmit={async (values) => {
          await api.createTrip(values);
          onDone();
        }}
      />
    </>
  );
}
