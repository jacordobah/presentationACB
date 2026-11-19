import { useSyncExternalStore } from "react";
import type { TripCode } from "../api/types";
import { todayInBogota } from "../lib/dates";
import { readJson, removeKey, writeJson } from "../lib/storage";

export interface ActiveTrip {
  tripId: number;
  routeCode: string;
  tripCode: TripCode;
  userId: number;
  date: string;
  // Persisted so tracking can resume after a reload without another lookup.
  geoRouteId?: string | null;
}

const STORAGE_KEY = "acb.activeTrip";
const listeners = new Set<() => void>();
let activeTrip = readJson<ActiveTrip>(STORAGE_KEY);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setActiveTrip(trip: ActiveTrip | null) {
  // A reload can briefly render the trip before its geometry is available;
  // keep the geoRouteId already stored instead of clearing it.
  const next =
    trip && activeTrip?.tripId === trip.tripId && trip.geoRouteId == null
      ? { ...trip, geoRouteId: activeTrip.geoRouteId }
      : trip;

  if (
    activeTrip?.tripId === next?.tripId &&
    activeTrip?.userId === next?.userId &&
    activeTrip?.routeCode === next?.routeCode &&
    activeTrip?.tripCode === next?.tripCode &&
    activeTrip?.date === next?.date &&
    activeTrip?.geoRouteId === next?.geoRouteId
  ) {
    return;
  }
  activeTrip = next;
  if (next) writeJson(STORAGE_KEY, next);
  else removeKey(STORAGE_KEY);
  listeners.forEach((listener) => listener());
}

export function clearActiveTrip(tripId: number) {
  if (activeTrip?.tripId === tripId) setActiveTrip(null);
}

// The trip in progress on this device, kept across reloads so the screen stays
// on until it ends.
export function useActiveTrip(userId: number) {
  const trip = useSyncExternalStore(subscribe, () => activeTrip);
  return trip?.userId === userId && trip.date === todayInBogota() ? trip : null;
}
