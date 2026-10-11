import { request } from "./http";
import type { School, SchoolInput } from "./types";

export function listSchools(zone?: string | null) {
  return request<School[]>("admin", "schools", { query: { zone } });
}

export function createSchool(input: SchoolInput) {
  return request<School>("admin", "schools", { method: "POST", body: input });
}

export function updateSchool(id: number, input: SchoolInput) {
  return request<School>("admin", `schools/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function deactivateSchool(id: number) {
  return request<void>("admin", `schools/${id}`, { method: "DELETE" });
}
