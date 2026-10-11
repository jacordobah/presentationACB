import { request } from "./http";
import type { ArrivalStatus, LateArrival } from "./types";

interface ArrivalFilters {
  zone?: string | null;
  guideId?: number | null;
  since?: string | null;
}

export function listArrivals(filters: ArrivalFilters = {}) {
  return request<LateArrival[]>("admin", "arrivals", { query: { ...filters } });
}

export function updateArrivalStatus(id: number, status: ArrivalStatus) {
  return request<LateArrival>("admin", `arrivals/${id}`, {
    method: "PATCH",
    body: { status },
  });
}
