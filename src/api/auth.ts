import { request } from "./http";
import type { SessionUser } from "./types";

export interface Session {
  token: string;
  user: SessionUser;
}

export function login(username: string, password: string) {
  return request<Session>("admin", "auth/login", {
    method: "POST",
    body: { username, password },
    authenticated: false,
  });
}
