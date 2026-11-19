import { request } from "./http";
import type { AttendanceRecord } from "./types";

export function listAttendance(routeId: number, from: string, to: string) {
  return request<AttendanceRecord[]>(
    "admin",
    `routes/${routeId}/attendance`,
    {
      query: { from, to },
    },
  );
}

export function saveAttendance(
  tripId: number,
  records: { studentId: number; studentName: string; present: boolean }[],
) {
  return request<{ saved: number }>("admin", `trips/${tripId}/attendance`, {
    method: "POST",
    body: { records },
  });
}
