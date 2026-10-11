import { CircleAlert, Inbox, RefreshCw, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="state" role="status">
      <div className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state" role="alert">
      <CircleAlert className="state__icon" size={40} aria-hidden="true" />
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="button" onClick={onRetry}>
          <RefreshCw size={20} aria-hidden="true" />
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="state">
      <Icon className="state__icon" size={40} aria-hidden="true" />
      <h2>{title}</h2>
      {children && <div className="muted">{children}</div>}
    </div>
  );
}
