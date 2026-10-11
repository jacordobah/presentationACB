import type { ReactNode } from "react";
import { Sheet } from "./Sheet";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  danger?: boolean;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
  danger = false,
  children,
}: ConfirmDialogProps) {
  return (
    <Sheet open={open} title={title} onClose={onCancel} variant="dialog">
      <div className="stack">
        {children}
        <div className="button-row">
          <button type="button" className="button" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className={`button ${danger ? "button--danger" : "button--primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Un momento…" : confirmLabel}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
