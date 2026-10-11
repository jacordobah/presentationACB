import { geoPublicUrl, request } from "./http";
import type {
  ArrivalResult,
  CodeReport,
  LatLng,
  OperationalCode,
  TripCode,
} from "./types";

interface CodeReportDto {
  id: string;
  name: string;
  route: string;
  trip_code: TripCode;
  status: OperationalCode;
  user_id: string;
  user_name: string | null;
  notified_at: string;
  latitude: number;
  longitude: number;
  detail: string | null;
  photo_url: string | null;
}

interface NotifyResponseDto {
  message: string;
  arrival?: {
    arrived_at: string;
    classification: ArrivalResult["classification"];
    minutes_late: number;
  };
}

export interface CodeReportInput {
  code: OperationalCode;
  label: string;
  routeCode: string;
  tripCode: TripCode;
  userId: number;
  location: LatLng;
  detail?: string;
  photoId?: string;
}

function toCodeReport(dto: CodeReportDto): CodeReport {
  return {
    id: dto.id,
    name: dto.name,
    routeCode: dto.route,
    tripCode: dto.trip_code,
    code: dto.status,
    userId: Number(dto.user_id),
    userName: dto.user_name,
    notifiedAt: dto.notified_at,
    location: { lat: dto.latitude, lng: dto.longitude },
    detail: dto.detail,
    photoUrl: dto.photo_url ? geoPublicUrl(dto.photo_url) : null,
  };
}

export async function reportCode(input: CodeReportInput) {
  const response = await request<NotifyResponseDto>("geo", "status/notify", {
    method: "POST",
    body: {
      name: input.label,
      route: input.routeCode,
      trip_code: input.tripCode,
      status: input.code,
      user_id: String(input.userId),
      notified_at: new Date().toISOString(),
      latitude: input.location.lat,
      longitude: input.location.lng,
      detail: input.detail,
      photo_id: input.photoId,
    },
  });
  const arrival: ArrivalResult | null = response.arrival
    ? {
        arrivedAt: response.arrival.arrived_at,
        classification: response.arrival.classification,
        minutesLate: response.arrival.minutes_late,
      }
    : null;
  return { message: response.message, arrival };
}

interface CodeReportFilters {
  routeCode?: string | null;
  zone?: string | null;
  date?: string;
}

export async function listCodeReports(filters: CodeReportFilters = {}) {
  const reports = await request<CodeReportDto[]>("geo", "status", {
    query: { route: filters.routeCode, zone: filters.zone, date: filters.date },
  });
  return reports.map(toCodeReport);
}
