function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const POLL_INTERVAL_MS = positiveNumber(
  import.meta.env.VITE_POLL_INTERVAL_MS,
  5000,
);
export const LIST_POLL_MS = 15_000;

// GPS tracking is opt-in until geolocaACB publishes OperationalReady routes
// and gatewayACB authorizes tracking sessions.
export const GPS_TRACKING_ENABLED =
  import.meta.env.VITE_GPS_TRACKING_ENABLED === "true";
export const GPS_POLICY_ID = import.meta.env.VITE_GPS_POLICY_ID?.trim() || null;
export const TRACKING_INTERVAL_MS = positiveNumber(
  import.meta.env.VITE_TRACKING_INTERVAL_MS,
  5000,
);
export const ESTIMATED_SPEED_KMH = positiveNumber(
  import.meta.env.VITE_ESTIMATED_SPEED_KMH,
  10,
);
export const ADMIN_APP_URL = import.meta.env.VITE_ADMIN_APP_URL?.trim() || null;
