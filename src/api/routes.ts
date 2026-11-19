import { request } from "./http";
import type { Route, RouteInput } from "./types";

interface RouteFilters {
  schoolId?: number | null;
  zone?: string | null;
}

export function listRoutes(filters: RouteFilters = {}) {
  return request<Route[]>("admin", "routes", { query: { ...filters } });
}

export function getRoute(routeId: number) {
  return request<Route>("admin", `routes/${routeId}`);
}

export function createRoute(input: RouteInput) {
  return request<Route>("admin", "routes", { method: "POST", body: input });
}

export function updateRoute(routeId: number, input: RouteInput) {
  return request<Route>("admin", `routes/${routeId}`, {
    method: "PUT",
    body: input,
  });
}

export function deactivateRoute(routeId: number) {
  return request<void>("admin", `routes/${routeId}`, { method: "DELETE" });
}

export function assignGuides(
  routeId: number,
  guides: { guideId: number; name?: string; primary: boolean }[],
) {
  return request<Route>("admin", `routes/${routeId}/guides`, {
    method: "PUT",
    body: { guides },
  });
}
