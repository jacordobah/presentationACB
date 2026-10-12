import type { LatLng } from "../api/types";

const EARTH_RADIUS_M = 6_371_008.8;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function distanceMeters(a: LatLng, b: LatLng) {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) *
      Math.cos(toRadians(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function lineLength(line: LatLng[]) {
  let total = 0;
  for (let i = 1; i < line.length; i++)
    total += distanceMeters(line[i - 1], line[i]);
  return total;
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return formatKilometers(meters);
}

export function formatKilometers(meters: number) {
  const kilometers = (meters / 1000).toLocaleString("es-CO", {
    maximumFractionDigits: 1,
  });
  return `${kilometers} km`;
}
