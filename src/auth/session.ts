import type { Session } from "../api/auth";
import { setSessionToken } from "../api/http";
import { readJson, removeKey, writeJson } from "../lib/storage";

const STORAGE_KEY = "acb.session";

// Only the backend can check the signature, so a token whose payload cannot be
// read is kept and left for the backend to reject.
function isExpired(token: string) {
  try {
    const [, payload] = token.split(".");
    const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
    const { exp } = JSON.parse(atob(base64)) as { exp?: unknown };
    return typeof exp === "number" && exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

export function restoreSession() {
  const session = readJson<Session>(STORAGE_KEY);
  if (session && isExpired(session.token)) {
    clearSession();
    return null;
  }
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
