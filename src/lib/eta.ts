import type { LatLng } from "../api/types";
import { lineLength } from "./geo";

const EARTH_RADIUS_M = 6_371_008.8;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

interface ProjectedPoint {
  x: number;
  y: number;
}

// Local equirectangular projection is accurate enough for a city route and
// keeps the nearest-segment search cheap on phones.
function project(point: LatLng, referenceLatitude: number): ProjectedPoint {
  return {
    x:
      EARTH_RADIUS_M *
      toRadians(point.lng) *
      Math.cos(toRadians(referenceLatitude)),
    y: EARTH_RADIUS_M * toRadians(point.lat),
  };
}

function segmentProgress(
  point: ProjectedPoint,
  start: ProjectedPoint,
  end: ProjectedPoint,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return 0;
  const projection =
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
  return Math.min(1, Math.max(0, projection));
}

export interface RemainingRoute {
  remainingM: number;
  coveredM: number;
  totalM: number;
  distanceToRouteM: number;
}

export function remainingRouteDistance(
  line: LatLng[],
  point: LatLng,
): RemainingRoute | null {
  if (line.length < 2) return null;
  const reference = project(point, point.lat);
  const projected = line.map((item) => project(item, point.lat));
  const totalM = lineLength(line);
  if (totalM === 0) return null;

  let cumulative = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestCovered = 0;
  for (let index = 1; index < projected.length; index += 1) {
    const start = projected[index - 1];
    const end = projected[index];
    const segmentM = Math.hypot(end.x - start.x, end.y - start.y);
    const fraction = segmentProgress(reference, start, end);
    const nearest = {
      x: start.x + (end.x - start.x) * fraction,
      y: start.y + (end.y - start.y) * fraction,
    };
    const distance = Math.hypot(
      reference.x - nearest.x,
      reference.y - nearest.y,
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      bestCovered = cumulative + segmentM * fraction;
    }
    cumulative += segmentM;
  }

  const coveredM = Math.min(totalM, Math.max(0, bestCovered));
  return {
    remainingM: Math.max(0, totalM - coveredM),
    coveredM,
    totalM,
    distanceToRouteM: bestDistance,
  };
}

export interface ArrivalEstimate {
  remainingM: number;
  eta: Date;
}

// An ETA from a point far away from the route would be misleading.
const MAX_OFF_ROUTE_M = 250;

export function estimateArrival(
  line: LatLng[],
  point: LatLng,
  speedKmh: number,
  now = Date.now(),
): ArrivalEstimate | null {
  if (!Number.isFinite(speedKmh) || speedKmh <= 0) return null;
  const progress = remainingRouteDistance(line, point);
  if (!progress || progress.distanceToRouteM > MAX_OFF_ROUTE_M) return null;
  const seconds = progress.remainingM / ((speedKmh * 1000) / 3600);
  return {
    remainingM: progress.remainingM,
    eta: new Date(now + seconds * 1000),
  };
}
