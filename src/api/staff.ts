import { request } from "./http";
import type { StaffInput, StaffMember } from "./types";

export type StaffKind = "guides" | "leaders";

export function listStaff(kind: StaffKind, zone?: string | null) {
  return request<StaffMember[]>("admin", kind, { query: { zone } });
}

export function createStaff(kind: StaffKind, input: StaffInput) {
  return request<StaffMember>("admin", kind, { method: "POST", body: input });
}

export function updateStaff(kind: StaffKind, id: number, input: StaffInput) {
  return request<StaffMember>("admin", `${kind}/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function deactivateStaff(kind: StaffKind, id: number) {
  return request<void>("admin", `${kind}/${id}`, { method: "DELETE" });
}
