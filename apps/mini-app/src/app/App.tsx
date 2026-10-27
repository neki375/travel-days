import type { Trip } from "@travel-days/shared";
import { useCallback, useState } from "react";
import { CheckInPage } from "../features/check-in/CheckInPage";
import { CheckOutPage } from "../features/check-out/CheckOutPage";
import { getInitData } from "../lib/telegram";
import { useBackButton } from "../lib/use-back-button";
import { HomePage } from "../pages/HomePage";

type Screen = { name: "home" } | { name: "check-in" } | { name: "check-out"; trip: Trip };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const goHome = useCallback(() => setScreen({ name: "home" }), []);

  useBackButton(screen.name === "home" ? null : goHome);

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
        />
      );
    case "check-in":
      return <CheckInPage onDone={goHome} onBack={goHome} />;
    case "check-out":
      return <CheckOutPage trip={screen.trip} onDone={goHome} onBack={goHome} />;
  }
}
