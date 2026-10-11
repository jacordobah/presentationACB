import { request } from "./http";
import type { Student, StudentInput } from "./types";

export function listStudents(routeCode: string) {
  return request<Student[]>("admin", `routes/${routeCode}/students`);
}

export function createStudent(input: StudentInput) {
  return request<Student>("admin", "students", { method: "POST", body: input });
}

export function updateStudent(id: number, input: StudentInput) {
  return request<Student>("admin", `students/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function deactivateStudent(id: number) {
  return request<void>("admin", `students/${id}`, { method: "DELETE" });
}
