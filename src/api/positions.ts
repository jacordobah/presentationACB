import { request } from "./http";
import type { LatestPosition, TripCode } from "./types";

interface LatestPositionDto {
  user_id: string;
  user_name: string | null;
  route: string;
  trip_code: TripCode;
  latitude: number;
  longitude: number;
  recorded_at: string;
}

export interface PositionInput {
  userId: number;
  routeCode: string;
  tripCode: TripCode;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recordedAt: string;
}

export function sendPosition(input: PositionInput) {
  return request<void>("geo", "positions", {
    method: "POST",
    body: {
      user_id: String(input.userId),
      route: input.routeCode,
      trip_code: input.tripCode,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      recorded_at: input.recordedAt,
    },
  });
}

export async function listLatestPositions(zone?: string | null) {
  const positions = await request<LatestPositionDto[]>(
    "geo",
    "positions/latest",
    { query: { zone } },
  );
  return positions.map((dto): LatestPosition => ({
    userId: Number(dto.user_id),
    userName: dto.user_name,
    routeCode: dto.route,
    tripCode: dto.trip_code,
    location: { lat: dto.latitude, lng: dto.longitude },
    recordedAt: dto.recorded_at,
  }));
}
