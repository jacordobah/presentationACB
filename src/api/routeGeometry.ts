import { lineLength } from "../lib/geo";
import { DESTINATION_RADIUS_M, MEETING_POINT_RADIUS_M } from "../lib/rules";
import { ApiError, request } from "./http";
import type {
  GeofenceReason,
  GeofenceStatus,
  LatLng,
  MeetingPointValidation,
  TripCode,
  TripGeometry,
} from "./types";

type Position = [number, number];

interface GeoDocumentDto {
  _id: string;
  name: string;
}

interface RouteDto extends GeoDocumentDto {
  route_code?: string | null;
  code?: string | null;
  start_meeting_point_id?: string | null;
  meeting_point_ids?: string[];
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

interface ValidationDto {
  distance_m: number;
  radius_m: number;
  status: GeofenceStatus;
  quality: {
    accuracy_m: number | null;
    max_accuracy_m: number;
    reason: GeofenceReason;
  };
}

export interface LocationInput {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: string;
}

const VALIDATION_ERRORS: Record<string, string> = {
  invalid_identifier:
    "El servicio de geolocalización no reconoce el trazado de esta ruta.",
  route_not_found:
    "El trazado de esta ruta ya no está en el servicio de geolocalización.",
  first_meeting_point_not_configured:
    "El PE01 de esta ruta aún no está configurado en el servicio de geolocalización.",
  referenced_meeting_point_not_found:
    "El PE01 configurado para esta ruta ya no está en el servicio de geolocalización.",
  invalid_geographic_association:
    "El PE01 configurado no corresponde al trazado de esta ruta en el servicio de geolocalización.",
  geofence_configuration_unavailable:
    "La validación de llegada al PE01 no está configurada en el servicio de geolocalización.",
  geographic_store_unavailable:
    "El servicio de geolocalización no pudo consultar el PE01. Intenta de nuevo en unos minutos.",
};

// geoloca stores route_code and code as separate fields. Older imports only
// encoded the trip in the line name, as in "MM01 541 Ruta al colegio".
const TRIP_LINE_NAME = /^\s*([A-Z]{2}\d{2})[\s_-]*(541|542)(?!\d)/i;

const toLatLng = ([lng, lat]: Position): LatLng => ({ lat, lng });

export function tripCodesFromRoute(route: {
  name: string;
  route_code?: string | null;
  code?: string | null;
}) {
  const named = TRIP_LINE_NAME.exec(route.name);
  const routeCode = (route.route_code ?? named?.[1] ?? "").trim().toUpperCase();
  const rawTripCode = (route.code ?? named?.[2] ?? "").trim();
  if (!/^[A-Z]{2}\d{2}$/.test(routeCode)) return null;
  if (rawTripCode !== "541" && rawTripCode !== "542") return null;
  return { routeCode, tripCode: rawTripCode as TripCode };
}

// The geo API stores the KMZ as it comes, so the meeting point codes, radii,
// length and destination are derived here.
function toTripGeometry(
  { routeCode, tripCode, route }: TripRoute,
  points: MeetingPointDto[],
  startPoint: MeetingPointDto | undefined,
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
  // A 542 trip starts at the school; make it the first stop so arrival and
  // attendance at the school work like any other point.
  if (tripCode === "542") {
    meetingPoints.unshift({
      code: "COLEGIO",
      order: 1,
      name: startPoint?.name ?? schoolName,
      description: startPoint?.description ?? null,
      radiusM: DESTINATION_RADIUS_M,
      location: startPoint
        ? toLatLng(startPoint.location.coordinates)
        : line[0],
    });
  }
  meetingPoints.forEach((point, index) => {
    point.order = index + 1;
  });
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
// uses only its latest line, the one with the greatest ObjectId. Each route
// points to its own meeting points through meeting_point_ids.
export async function listTripGeometries(
  filters: GeometryFilters = {},
  schoolName?: string | null,
) {
  const [routes, points] = await Promise.all([
    request<RouteDto[]>("geo", "routes"),
    request<MeetingPointDto[]>("geo", "meeting-points"),
  ]);
  const pointsById = new Map(points.map((point) => [point._id, point]));
  const latest = new Map<string, TripRoute>();
  for (const route of routes) {
    const trip = tripCodesFromRoute(route);
    if (!trip) continue;
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
    .map((trip) => {
      const routePoints = (trip.route.meeting_point_ids ?? [])
        .map((id) => pointsById.get(id))
        .filter((point): point is MeetingPointDto => point !== undefined);
      if (routePoints.length === 0) return null;
      const startPoint = trip.route.start_meeting_point_id
        ? pointsById.get(trip.route.start_meeting_point_id)
        : undefined;
      return toTripGeometry(
        trip,
        routePoints,
        startPoint,
        schoolName ?? "Colegio",
      );
    })
    .filter((geometry): geometry is TripGeometry => geometry !== null)
    .sort(
      (a, b) =>
        a.routeCode.localeCompare(b.routeCode) ||
        a.tripCode.localeCompare(b.tripCode),
    );
}

// The geo API decides whether a position counts as an arrival at the first
// point of a trip, with its own radius and limit on the GPS accuracy.
export async function validateFirstMeetingPoint(
  geoRouteId: string,
  input: LocationInput,
): Promise<MeetingPointValidation> {
  const result = await request<ValidationDto>(
    "geo",
    `routes/${geoRouteId}/first-meeting-point/validate`,
    {
      method: "POST",
      body: {
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy_m: input.accuracy,
        captured_at: input.capturedAt,
      },
    },
  ).catch((error: unknown) => {
    if (
      error instanceof ApiError &&
      error.code &&
      VALIDATION_ERRORS[error.code]
    ) {
      throw new ApiError(
        error.status,
        VALIDATION_ERRORS[error.code],
        error.code,
      );
    }
    throw error;
  });
  return {
    status: result.status,
    reason: result.quality.reason,
    distanceM: result.distance_m,
    radiusM: result.radius_m,
    accuracyM: result.quality.accuracy_m,
    maxAccuracyM: result.quality.max_accuracy_m,
  };
}
