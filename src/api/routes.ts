import { request } from "./http";
import type { Route } from "./types";

interface RouteFilters {
  schoolId?: number | null;
  zone?: string | null;
}

export function listRoutes(filters: RouteFilters = {}) {
  return request<Route[]>("admin", "routes", { query: { ...filters } });
}
