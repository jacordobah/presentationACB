import { lineLength } from "../lib/geo";
import { DESTINATION_RADIUS_M, MEETING_POINT_RADIUS_M } from "../lib/rules";
import { request } from "./http";
import type { LatLng, TripCode, TripGeometry } from "./types";

type Position = [number, number];

interface GeoDocumentDto {
  _id: string;
  import_id: string;
  name: string;
}

interface RouteDto extends GeoDocumentDto {
  geometry: { type: "LineString"; coordinates: Position[] };
}

interface MeetingPointDto extends GeoDocumentDto {
  description: string | null;
  location: { type: "Point"; coordinates: Position };
}

interface TripRoute {
  routeCode: string;
  tripCode: TripCode;
  route: RouteDto;
}

interface ImportResultDto {
  message: string;
  import_id: string;
  saved_routes: number;
  saved_points: number;
}

const MAX_KMZ_BYTES = 20 * 1024 * 1024;

// The geo API stores no route or trip codes, so a line belongs to a trip when
// its name starts with both, as in "MM01 541 Ruta al colegio" or "MM01-542".
const TRIP_LINE_NAME = /^\s*([A-Z]{2}\d{2})[\s_-]*(541|542)(?!\d)/i;

const toLatLng = ([lng, lat]: Position): LatLng => ({ lat, lng });

function tripFromLineName(name: string) {
  const match = TRIP_LINE_NAME.exec(name);
  return match
    ? { routeCode: match[1].toUpperCase(), tripCode: match[2] as TripCode }
    : null;
}

// The geo API stores the KMZ as it comes, so the meeting point codes, radii,
// length and destination are derived here.
function toTripGeometry(
  { routeCode, tripCode, route }: TripRoute,
  points: MeetingPointDto[],
  schoolName: string,
): TripGeometry {
  const line = route.geometry.coordinates.map(toLatLng);
  const meetingPoints = points.map((point, index) => ({
    code: `PE${String(index + 1).padStart(2, "0")}`,
    order: index + 1,
    name: point.name,
    description: point.description,
    radiusM: MEETING_POINT_RADIUS_M,
    location: toLatLng(point.location.coordinates),
  }));
  const lastPoint = meetingPoints[meetingPoints.length - 1];
  return {
    geoRouteId: route._id,
    routeCode,
    tripCode,
    name: route.name,
    lengthM: Math.round(lineLength(line)),
    line,
    meetingPoints,
    // A 541 trip ends at the school, where its line ends; a 542 trip ends at
    // its last meeting point.
    destination:
      tripCode === "541"
        ? {
            name: schoolName,
            radiusM: DESTINATION_RADIUS_M,
            location: line[line.length - 1],
          }
        : {
            name: lastPoint.name,
            radiusM: lastPoint.radiusM,
            location: lastPoint.location,
          },
  };
}

interface GeometryFilters {
  zone?: string | null;
  routeCode?: string;
  tripCode?: TripCode;
}

// Every upload is a new import and the earlier ones stay stored, so each trip
// uses only its latest line, the one with the greatest ObjectId. Imports
// without meeting points are skipped, since a trip starts at its PE01.
export async function listTripGeometries(
  filters: GeometryFilters = {},
  schoolName?: string | null,
) {
  const [routes, points] = await Promise.all([
    request<RouteDto[]>("geo", "routes"),
    request<MeetingPointDto[]>("geo", "meeting-points"),
  ]);
  const importsWithPoints = new Set(points.map((point) => point.import_id));
  const latest = new Map<string, TripRoute>();
  for (const route of routes) {
    const trip = tripFromLineName(route.name);
    if (!trip || !importsWithPoints.has(route.import_id)) continue;
    if (filters.routeCode && trip.routeCode !== filters.routeCode) continue;
    if (filters.tripCode && trip.tripCode !== filters.tripCode) continue;
    if (filters.zone && !trip.routeCode.startsWith(filters.zone)) continue;
    const key = `${trip.routeCode}:${trip.tripCode}`;
    const current = latest.get(key);
    if (!current || route._id > current.route._id) {
      latest.set(key, { ...trip, route });
    }
  }
  return [...latest.values()]
    .map((trip) =>
      toTripGeometry(
        trip,
        points.filter((point) => point.import_id === trip.route.import_id),
        schoolName ?? "Colegio",
      ),
    )
    .sort(
      (a, b) =>
        a.routeCode.localeCompare(b.routeCode) ||
        a.tripCode.localeCompare(b.tripCode),
    );
}

export async function importKmz(
  routeCode: string,
  tripCode: TripCode,
  file: File,
) {
  if (!file.name.toLowerCase().endsWith(".kmz")) {
    throw new Error("El archivo debe tener la extensión .kmz.");
  }
  if (file.size > MAX_KMZ_BYTES) {
    throw new Error("El archivo supera el tamaño máximo de 20 MB.");
  }
  const form = new FormData();
  form.append("file", file);
  form.append("route_code", routeCode);
  form.append("trip_code", tripCode);
  const result = await request<ImportResultDto>("geo", "imports/kmz", {
    method: "POST",
    form,
  });
  return { message: result.message, savedPoints: result.saved_points };
}
