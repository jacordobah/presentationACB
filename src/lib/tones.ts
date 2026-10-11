import type { TripStatus } from "../api/types";

export const TRIP_ROW_TONES: Record<TripStatus, string> = {
  SCHEDULED: "list-row--scheduled",
  IN_PROGRESS: "list-row--progress",
  FINISHED: "list-row--done",
};
