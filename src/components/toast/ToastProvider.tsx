import {
  CircleAlert,
  CircleCheck,
  Info,
  Siren,
  TriangleAlert,
  X,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ToastContext,
  type ToastOptions,
  type ToastTone,
} from "./ToastContext";
import "./Toast.css";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastOptions["action"];
}

const ICONS = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
  emergency: Siren,
};

const VISIBLE_TOASTS = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const nextId = useRef(1);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const toast = {
        id: nextId.current++,
        message,
        tone: options.tone ?? "info",
        action: options.action,
      };
      setToasts((current) => [...current.slice(-(VISIBLE_TOASTS - 1)), toast]);
      const urgent = toast.tone === "emergency" || toast.tone === "error";
      window.setTimeout(() => dismiss(toast.id), urgent ? 12000 : 6000);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext value={api}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          const urgent = toast.tone === "emergency" || toast.tone === "error";
          return (
            <div
              key={toast.id}
              className={`toast toast--${toast.tone}`}
              role={urgent ? "alert" : "status"}
            >
              <Icon size={22} aria-hidden="true" />
              <p className="toast__message">{toast.message}</p>
              {toast.action && (
                <button
                  type="button"
                  className="toast__action"
                  onClick={() => {
                    toast.action?.onSelect();
                    dismiss(toast.id);
                  }}
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                className="toast__close"
                onClick={() => dismiss(toast.id)}
                aria-label="Cerrar aviso"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}
