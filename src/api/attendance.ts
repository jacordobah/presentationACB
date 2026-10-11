import { request } from "./http";
import type { AttendanceRecord } from "./types";

export function listAttendance(routeCode: string, from: string, to: string) {
  return request<AttendanceRecord[]>(
    "admin",
    `routes/${routeCode}/attendance`,
    {
      query: { from, to },
    },
  );
}

export function saveAttendance(
  tripId: number,
  meetingPointCode: string,
  records: { studentId: number; present: boolean }[],
) {
  return request<void>("admin", `trips/${tripId}/attendance`, {
    method: "POST",
    body: { meetingPointCode, records },
  });
}
