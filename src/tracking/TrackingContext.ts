import { createContext, useContext } from "react";
import { GPS_TRACKING_ENABLED } from "../lib/config";

export type TrackingStatus =
  "idle" | "disabled" | "starting" | "active" | "paused" | "retrying" | "error";

export interface TrackingView {
  status: TrackingStatus;
  message: string | null;
  lastSentAt: number | null;
  trackingId: string | null;
}

export const IDLE_TRACKING: TrackingView = {
  status: GPS_TRACKING_ENABLED ? "idle" : "disabled",
  message: GPS_TRACKING_ENABLED
    ? null
    : "El seguimiento GPS no está habilitado en esta versión.",
  lastSentAt: null,
  trackingId: null,
};

export const TrackingContext = createContext<TrackingView>(IDLE_TRACKING);

export function useTracking() {
  return useContext(TrackingContext);
}
