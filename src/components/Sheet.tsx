import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import "./Sheet.css";

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  variant?: "sheet" | "dialog";
}

// A modal built on <dialog>: it slides up from the bottom on phones and sits
// centered on wide screens. The browser handles focus trapping and closing with
// Escape.
export function Sheet({
  open,
  title,
  onClose,
  children,
  variant = "sheet",
}: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`sheet sheet--${variant}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open && (
        <div className="sheet__content">
          <div className="sheet__header">
            <h2 id={titleId}>{title}</h2>
            <button
              type="button"
              className="button button--quiet button--icon"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <X size={24} aria-hidden="true" />
            </button>
          </div>
          <div className="sheet__body">{children}</div>
        </div>
      )}
    </dialog>
  );
}
