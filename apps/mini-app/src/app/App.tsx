import type { Trip } from "@travel-days/shared";
import { useCallback, useState } from "react";
import { CheckInPage } from "../features/check-in/CheckInPage";
import { CheckOutPage } from "../features/check-out/CheckOutPage";
import { AddTripPage } from "../features/trip-history/AddTripPage";
import { EditTripPage } from "../features/trip-history/EditTripPage";
import { HistoryPage } from "../features/trip-history/HistoryPage";
import { getInitData } from "../lib/telegram";
import { useBackButton } from "../lib/use-back-button";
import { HomePage } from "../pages/HomePage";

type Screen =
  | { name: "home" }
  | { name: "check-in" }
  | { name: "check-out"; trip: Trip }
  | { name: "history" }
  | { name: "add-trip" }
  | { name: "edit-trip"; trip: Trip };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const goHome = useCallback(() => setScreen({ name: "home" }), []);
  const goHistory = useCallback(() => setScreen({ name: "history" }), []);

  const goBack =
    screen.name === "home"
      ? null
      : screen.name === "add-trip" || screen.name === "edit-trip"
        ? goHistory
        : goHome;
  useBackButton(goBack);

  if (!getInitData()) {
    return (
      <div className="card">
        <h1>Travel Days</h1>
        <p className="hint">Откройте приложение через Telegram-бота.</p>
      </div>
    );
  }

  switch (screen.name) {
    case "home":
      return (
        <HomePage
          onCheckIn={() => setScreen({ name: "check-in" })}
          onCheckOut={(trip) => setScreen({ name: "check-out", trip })}
          onHistory={goHistory}
        />
      );
    case "check-in":
      return <CheckInPage onDone={goHome} onBack={goHome} />;
    case "check-out":
      return <CheckOutPage trip={screen.trip} onDone={goHome} onBack={goHome} />;
    case "history":
      return (
        <HistoryPage
          onSelect={(trip) => setScreen({ name: "edit-trip", trip })}
          onAdd={() => setScreen({ name: "add-trip" })}
          onBack={goHome}
        />
      );
    case "add-trip":
      return <AddTripPage onDone={goHistory} onBack={goHistory} />;
    case "edit-trip":
      return <EditTripPage trip={screen.trip} onDone={goHistory} onBack={goHistory} />;
  }
}
