import { useEffect } from "react";
import { getWebApp } from "./telegram";

/** Shows Telegram's native back button while `onBack` is set. */
export function useBackButton(onBack: (() => void) | null): void {
  useEffect(() => {
    const button = getWebApp()?.BackButton;
    if (!button || !onBack) {
      button?.hide();
      return;
    }

    button.show();
    button.onClick(onBack);
    return () => {
      button.offClick(onBack);
      button.hide();
    };
  }, [onBack]);
}
