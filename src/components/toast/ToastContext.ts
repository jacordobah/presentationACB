import { createContext, useContext } from "react";

export type ToastTone = "info" | "success" | "warning" | "error" | "emergency";

export interface ToastOptions {
  tone?: ToastTone;
  action?: { label: string; onSelect: () => void };
}

export interface ToastApi {
  show: (message: string, options?: ToastOptions) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Algo salió mal. Intenta de nuevo.";
}
