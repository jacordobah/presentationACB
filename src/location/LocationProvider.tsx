import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LocationContext,
  type Fix,
  type LocationStatus,
} from "./LocationContext";

const geolocationSupported =
  typeof navigator !== "undefined" && "geolocation" in navigator;

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 20000,
};

export function LocationProvider({ children }: { children: ReactNode }) {
  const [watchers, setWatchers] = useState(0);
  const [deviceFix, setDeviceFix] = useState<Fix | null>(null);
  const [error, setError] = useState<"denied" | "unavailable" | null>(null);
  const [simulatedFix, setSimulatedFix] = useState<Fix | null>(null);
  const watching = watchers > 0;

  useEffect(() => {
    if (!watching || !geolocationSupported) return;
    const id = navigator.geolocation.watchPosition(
      (position) => {
        setDeviceFix({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          simulated: false,
        });
        setError(null);
      },
      (positionError) => {
        setError(
          positionError.code === positionError.PERMISSION_DENIED
            ? "denied"
            : "unavailable",
        );
      },
      WATCH_OPTIONS,
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [watching]);

  const watch = useCallback(() => {
    setWatchers((count) => count + 1);
    return () => setWatchers((count) => count - 1);
  }, []);

  const fix = simulatedFix ?? deviceFix;
  let status: LocationStatus = "waiting";
  if (simulatedFix) status = "ready";
  else if (!geolocationSupported) status = "unsupported";
  else if (error === "denied") status = "denied";
  else if (deviceFix) status = "ready";
  else if (error) status = error;

  const value = useMemo(
    () => ({ fix, status, watch, setSimulatedFix }),
    [fix, status, watch],
  );

  return <LocationContext value={value}>{children}</LocationContext>;
}
