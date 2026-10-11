import { request } from "./http";
import type { LatLng, TripCode, TripGeometry } from "./types";

interface PointDto {
  type: "Point";
  coordinates: [number, number];
}

interface GeoTripDto {
  route_code: string;
  trip_code: TripCode;
  name: string;
  length_m: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  meeting_points: {
    code: string;
    order: number;
    name: string;
    description: string | null;
    radius_m: number;
    location: PointDto;
  }[];
  destination: { name: string; radius_m: number; location: PointDto };
}

interface ImportResultDto {
  message: string;
  import_id: string;
  saved_routes: number;
  saved_points: number;
}

const toLatLng = ([lng, lat]: [number, number]): LatLng => ({ lat, lng });

function toTripGeometry(dto: GeoTripDto): TripGeometry {
  return {
    routeCode: dto.route_code,
    tripCode: dto.trip_code,
    name: dto.name,
    lengthM: dto.length_m,
    line: dto.geometry.coordinates.map(toLatLng),
    meetingPoints: dto.meeting_points
      .map((point) => ({
        code: point.code,
        order: point.order,
        name: point.name,
        description: point.description,
        radiusM: point.radius_m,
        location: toLatLng(point.location.coordinates),
      }))
      .sort((a, b) => a.order - b.order),
    destination: {
      name: dto.destination.name,
      radiusM: dto.destination.radius_m,
      location: toLatLng(dto.destination.location.coordinates),
    },
  };
}

interface GeometryFilters {
  zone?: string | null;
  routeCode?: string;
  tripCode?: TripCode;
}

export async function listTripGeometries(filters: GeometryFilters = {}) {
  const trips = await request<GeoTripDto[]>("geo", "routes", {
    query: {
      zone: filters.zone,
      route_code: filters.routeCode,
      trip_code: filters.tripCode,
    },
  });
  return trips.map(toTripGeometry);
}

export async function importKmz(
  routeCode: string,
  tripCode: TripCode,
  file: File,
) {
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
