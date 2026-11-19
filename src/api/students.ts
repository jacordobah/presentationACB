import { request } from "./http";
import type { Student } from "./types";

export function listStudents(routeId: number) {
  return request<Student[]>("admin", `routes/${routeId}/students`);
}
