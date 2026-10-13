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

const MAX_KMZ_BYTES = 20 * 1024 * 1024;

// The geo API explains why an import failed in English, so the guide gets one
// of these messages by status instead.
const IMPORT_ERRORS: Record<number, string> = {
  400: "El archivo debe ser un KMZ y no puede estar vacío.",
  413: "El archivo supera el tamaño máximo de 20 MB.",
  422: "No se pudo leer el KMZ. Revisa que tenga la línea del recorrido y sus puntos de encuentro.",
  503: "El servicio de geolocalización no pudo guardar el archivo. Intenta de nuevo.",
};

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

// Reports whether one of the imported lines is named after the trip, which is
// what ties the import to it. The geo API cannot delete imports, so one that is
// not tied stays stored.
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
  const result = await request<ImportResultDto>("geo", "imports/kmz", {
    method: "POST",
    form,
  }).catch((error: unknown) => {
    if (error instanceof ApiError && IMPORT_ERRORS[error.status]) {
      throw new ApiError(error.status, IMPORT_ERRORS[error.status]);
    }
    throw error;
  });
  const routes = await request<RouteDto[]>("geo", "routes", {
    query: { import_id: result.import_id },
  });
  const linked = routes.some((route) => {
    const trip = tripFromLineName(route.name);
    return trip?.routeCode === routeCode && trip.tripCode === tripCode;
  });
  return { linked };
}

// The geo API decides whether a position counts as an arrival at the PE01 of a
// trip, with its own radius and limit on the GPS accuracy.
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
