/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_LOCATION_SIMULATOR?: string;
  readonly VITE_POLL_INTERVAL_MS?: string;
  readonly VITE_GPS_TRACKING_ENABLED?: string;
  readonly VITE_GPS_POLICY_ID?: string;
  readonly VITE_TRACKING_INTERVAL_MS?: string;
  readonly VITE_ESTIMATED_SPEED_KMH?: string;
  readonly VITE_ADMIN_APP_URL?: string;
}
