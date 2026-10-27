/**
 * Minimal typing of the Telegram WebApp object used by this app:
 * https://core.telegram.org/bots/webapps#initializing-mini-apps
 */
export interface TelegramWebApp {
  /** Signed launch data; validated by the server, never trusted on the client. */
  initData: string;
  colorScheme: "light" | "dark";
  ready(): void;
  expand(): void;
  BackButton: {
    show(): void;
    hide(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
  };
  HapticFeedback?: {
    notificationOccurred(type: "error" | "success" | "warning"): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getWebApp(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp;
}

/**
 * initData of the current launch. Outside Telegram it is empty; in development a value
 * signed by `npm run dev:init-data` is used instead, so the server check stays the same.
 */
export function getInitData(): string {
  const fromTelegram = getWebApp()?.initData;
  if (fromTelegram) {
    return fromTelegram;
  }
  return import.meta.env.DEV ? (import.meta.env.VITE_DEV_INIT_DATA ?? "") : "";
}
