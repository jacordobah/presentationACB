import { request } from "./http";
import type { Trip, TripSummary } from "./types";

interface TripFilters {
  date?: string;
  zone?: string | null;
  userId?: number | null;
}

export function listTrips(filters: TripFilters = {}) {
  return request<Trip[]>("admin", "trips", { query: { ...filters } });
}

export function startTrip(id: number) {
  return request<Trip>("admin", `trips/${id}/start`, { method: "POST" });
}

export function finishTrip(id: number) {
  return request<TripSummary>("admin", `trips/${id}/finish`, {
    method: "POST",
  });
}

export function assumeTrip(id: number) {
  return request<Trip>("admin", `trips/${id}/executors`, { method: "POST" });
}
