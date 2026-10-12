import type { TripGeometry } from "../api/types";

export const MAX_STUDENTS = 30;
export const MAX_TRIP_LENGTH_M = 5500;
export const MAX_ROUTE_LENGTH_M = 11000;
export const MEETING_POINT_RADIUS_M = 50;
export const DESTINATION_RADIUS_M = 80;
export const WAIT_MS = 2 * 60_000;
export const EXTENDED_WAIT_MS = 5 * 60_000;

export function requiredGuides(studentCount: number) {
  return studentCount <= 5 ? 1 : 2;
}

export function routeWithinLimits(geometries: TripGeometry[]) {
  const total = geometries.reduce((sum, geometry) => sum + geometry.lengthM, 0);
  return (
    geometries.length === 2 &&
    geometries.every((geometry) => geometry.lengthM <= MAX_TRIP_LENGTH_M) &&
    total <= MAX_ROUTE_LENGTH_M
  );
}
