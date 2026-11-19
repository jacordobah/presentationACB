import { request } from "./http";
import type {
  Student,
  StudentEnrollmentInput,
  StudentInput,
  TripCode,
} from "./types";

export function listStudents(routeId: number) {
  return request<Student[]>("admin", `routes/${routeId}/students`);
}

export function getRouteStudent(studentId: number) {
  return request<Student>("admin", `route-students/${studentId}`);
}

export function createStudent(routeId: number, input: StudentInput) {
  return request<Student>("admin", `routes/${routeId}/students`, {
    method: "POST",
    body: input,
  });
}

export function updateStudent(
  studentId: number,
  student: StudentEnrollmentInput,
  meetingPoints?: Record<TripCode, string>,
) {
  return request<Student>("admin", `route-students/${studentId}`, {
    method: "PUT",
    body: { student, meetingPoints },
  });
}

export function deactivateStudent(studentId: number) {
  return request<void>("admin", `route-students/${studentId}`, {
    method: "DELETE",
  });
}
