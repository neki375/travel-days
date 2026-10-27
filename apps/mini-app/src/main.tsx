import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { getWebApp, syncColorScheme } from "./lib/telegram";
import "./styles.css";

const webApp = getWebApp();
webApp?.ready();
webApp?.expand();
syncColorScheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
