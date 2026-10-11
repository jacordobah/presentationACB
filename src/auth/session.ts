import type { Session } from "../api/auth";
import { setSessionToken } from "../api/http";
import { readJson, removeKey, writeJson } from "../lib/storage";

const STORAGE_KEY = "acb.session";

export function restoreSession() {
  const session = readJson<Session>(STORAGE_KEY);
  setSessionToken(session?.token ?? null);
  return session;
}

export function persistSession(session: Session) {
  setSessionToken(session.token);
  writeJson(STORAGE_KEY, session);
}

export function clearSession() {
  setSessionToken(null);
  removeKey(STORAGE_KEY);
}
