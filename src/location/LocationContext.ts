import { createContext, useContext, useEffect } from "react";

export interface Fix {
  lat: number;
  lng: number;
  accuracy: number | null;
  timestamp: number;
  simulated: boolean;
}

export type LocationStatus =
  "unsupported" | "waiting" | "ready" | "denied" | "unavailable";

export interface LocationContextValue {
  fix: Fix | null;
  status: LocationStatus;
  watch: () => () => void;
  setSimulatedFix: (fix: Fix | null) => void;
}

export const LocationContext = createContext<LocationContextValue | null>(null);

// Reading the location starts the GPS watch; it stops when no mounted component
// needs it.
export function useDeviceLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useDeviceLocation must be used inside LocationProvider");
  }
  const { watch } = context;
  useEffect(() => watch(), [watch]);
  return context;
}
