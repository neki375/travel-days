import { isInsideTelegram } from "../lib/telegram";

interface PageHeaderProps {
  title: string;
  /** Inside Telegram the native back button is used; in a browser a link is shown. */
  onBack?: () => void;
}

export function PageHeader({ title, onBack }: PageHeaderProps) {
  return (
    <header className="page-header">
      {onBack && !isInsideTelegram() && (
        <button type="button" className="link-button" onClick={onBack}>
          ← Назад
        </button>
      )}
      <h1>{title}</h1>
    </header>
  );
}
