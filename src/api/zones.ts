import { request } from "./http";
import type { Zone } from "./types";

export function listZones() {
  return request<Zone[]>("admin", "zones");
}
