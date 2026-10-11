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
  if (
    activeTrip?.tripId === trip?.tripId &&
    activeTrip?.userId === trip?.userId
  ) {
    return;
  }
  activeTrip = trip;
  if (trip) writeJson(STORAGE_KEY, trip);
  else removeKey(STORAGE_KEY);
  listeners.forEach((listener) => listener());
}

export function clearActiveTrip(tripId: number) {
  if (activeTrip?.tripId === tripId) setActiveTrip(null);
}

// The trip in progress on this device, kept across reloads so positions keep
// flowing.
export function useActiveTrip(userId: number) {
  const trip = useSyncExternalStore(subscribe, () => activeTrip);
  return trip?.userId === userId && trip.date === todayInBogota() ? trip : null;
}
