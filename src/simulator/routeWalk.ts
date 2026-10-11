import type { LatLng } from "../api/types";
import { distanceMeters } from "../lib/geo";

export function lineLength(line: LatLng[]) {
  let total = 0;
  for (let i = 1; i < line.length; i++)
    total += distanceMeters(line[i - 1], line[i]);
  return total;
}

export function pointAlong(line: LatLng[], distance: number): LatLng {
  let remaining = Math.max(0, distance);
  for (let i = 1; i < line.length; i++) {
    const from = line[i - 1];
    const to = line[i];
    const segment = distanceMeters(from, to);
    if (remaining <= segment) {
      const ratio = segment === 0 ? 0 : remaining / segment;
      return {
        lat: from.lat + (to.lat - from.lat) * ratio,
        lng: from.lng + (to.lng - from.lng) * ratio,
      };
    }
    remaining -= segment;
  }
  return line[line.length - 1];
}

// Distance along the line to the vertex closest to the point; close enough to
// resume a walk from wherever the simulated device currently is.
export function distanceAlong(line: LatLng[], point: LatLng) {
  let along = 0;
  let best = { distance: Infinity, along: 0 };
  for (let i = 0; i < line.length; i++) {
    if (i > 0) along += distanceMeters(line[i - 1], line[i]);
    const distance = distanceMeters(line[i], point);
    if (distance < best.distance) best = { distance, along };
  }
  return best.along;
}
