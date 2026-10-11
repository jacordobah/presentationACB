import { request } from "./http";
import type { Route, RouteInput, RouteStatus } from "./types";

interface RouteFilters {
  zone?: string | null;
  status?: RouteStatus | null;
  guideId?: number | null;
}

export function listRoutes(filters: RouteFilters = {}) {
  return request<Route[]>("admin", "routes", { query: { ...filters } });
}

export function getRoute(code: string) {
  return request<Route>("admin", `routes/${code}`);
}

export function createRoute(input: RouteInput) {
  return request<Route>("admin", "routes", { method: "POST", body: input });
}

export function updateRoute(code: string, input: RouteInput) {
  return request<Route>("admin", `routes/${code}`, {
    method: "PUT",
    body: input,
  });
}

export function deactivateRoute(code: string) {
  return request<void>("admin", `routes/${code}`, { method: "DELETE" });
}

export function submitRoute(code: string) {
  return request<Route>("admin", `routes/${code}/submit`, { method: "POST" });
}

export function approveRoute(code: string) {
  return request<Route>("admin", `routes/${code}/approve`, { method: "POST" });
}

export function rejectRoute(code: string, notes: string) {
  return request<Route>("admin", `routes/${code}/reject`, {
    method: "POST",
    body: { notes },
  });
}

export function assignGuides(
  code: string,
  guides: { guideId: number; primary: boolean }[],
) {
  return request<Route>("admin", `routes/${code}/guides`, {
    method: "PUT",
    body: { guides },
  });
}
