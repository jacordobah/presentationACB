import { lineLength } from "../lib/geo";
import { DESTINATION_RADIUS_M, MEETING_POINT_RADIUS_M } from "../lib/rules";
import { request } from "./http";
import type { LatLng, TripCode, TripGeometry } from "./types";

type Position = [number, number];

interface GeoDocumentDto {
  _id: string;
  import_id: string;
  route_code?: string;
  trip_code?: TripCode;
  name: string;
}

interface RouteDto extends GeoDocumentDto {
  geometry: { type: "LineString"; coordinates: Position[] };
}

interface MeetingPointDto extends GeoDocumentDto {
  description: string | null;
  location: { type: "Point"; coordinates: Position };
}

interface ImportResultDto {
  message: string;
  import_id: string;
  saved_routes: number;
  saved_points: number;
}

const MAX_KMZ_BYTES = 20 * 1024 * 1024;

const toLatLng = ([lng, lat]: Position): LatLng => ({ lat, lng });

// Documents imported without route_code and trip_code cannot be tied to a trip.
const isTripRoute = (route: RouteDto): route is Required<RouteDto> =>
  Boolean(route.route_code && route.trip_code);

// The geo API stores the KMZ as it comes, so the meeting point codes, radii,
// length and destination are derived here.
function toTripGeometry(
  route: Required<RouteDto>,
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
    routeCode: route.route_code,
    tripCode: route.trip_code,
    name: route.name,
    lengthM: Math.round(lineLength(line)),
    line,
    meetingPoints,
    // A 541 trip ends at the school, where its line ends; a 542 trip ends at
    // its last meeting point.
    destination:
      route.trip_code === "541"
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
// uses only its latest line, the one with the greatest ObjectId.
export async function listTripGeometries(
  filters: GeometryFilters = {},
  schoolName?: string | null,
) {
  const query = { route_code: filters.routeCode, trip_code: filters.tripCode };
  const [routes, points] = await Promise.all([
    request<RouteDto[]>("geo", "routes", { query }),
    request<MeetingPointDto[]>("geo", "meeting-points", { query }),
  ]);
  const latest = new Map<string, Required<RouteDto>>();
  for (const route of routes.filter(isTripRoute)) {
    if (filters.zone && !route.route_code.startsWith(filters.zone)) continue;
    const key = `${route.route_code}:${route.trip_code}`;
    const current = latest.get(key);
    if (!current || route._id > current._id) latest.set(key, route);
  }
  return [...latest.values()]
    .map((route) =>
      toTripGeometry(
        route,
        points.filter((point) => point.import_id === route.import_id),
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
