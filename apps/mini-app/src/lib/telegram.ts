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
  /** Swipe-down-to-close gesture control; Bot API 7.7+, absent in older clients. */
  disableVerticalSwipes?(): void;
  enableVerticalSwipes?(): void;
  /** Native confirmation dialog; throws in clients older than Bot API 6.2. */
  showConfirm?(message: string, callback: (confirmed: boolean) => void): void;
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

/** The SDK script is also loaded in a regular browser; only a Telegram launch has initData. */
export function isInsideTelegram(): boolean {
  return Boolean(getWebApp()?.initData);
}

/**
 * Turns Telegram's swipe-down-to-close gesture off while the user drags content such as a
 * zoomed map, and back on afterwards. No-op outside Telegram and in old clients.
 */
export function setVerticalSwipesEnabled(enabled: boolean): void {
  const webApp = getWebApp();
  if (!isInsideTelegram() || !webApp) {
    return;
  }
  try {
    if (enabled) {
      webApp.enableVerticalSwipes?.();
    } else {
      webApp.disableVerticalSwipes?.();
    }
  } catch {
    // Unsupported client version: the gesture simply stays as it is.
  }
}

/** Asks the user to confirm, using Telegram's dialog when available. */
export async function confirmAction(message: string): Promise<boolean> {
  const webApp = getWebApp();
  const showConfirm = webApp?.showConfirm?.bind(webApp);
  if (isInsideTelegram() && showConfirm) {
    try {
      return await new Promise<boolean>((resolve) => showConfirm(message, resolve));
    } catch {
      // Older clients throw: fall back to the browser dialog.
    }
  }
  return window.confirm(message);
}

export function notifyHaptic(type: "error" | "success"): void {
  getWebApp()?.HapticFeedback?.notificationOccurred(type);
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
