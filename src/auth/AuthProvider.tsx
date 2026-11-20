import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { login, type Session } from "../api/auth";
import { onUnauthorized } from "../api/http";
import { AuthContext } from "./AuthContext";
import { clearSession, persistSession, restoreSession } from "./session";

const GUIDE_ONLY_MESSAGE =
  "Esta aplicación es solo para guías. La administración está en el panel web.";

function restoreGuideSession() {
  const session = restoreSession();
  if (session && session.user.role !== "GUIDE") {
    clearSession();
    return null;
  }
  return session;
}

const initialSession: Session | null = restoreGuideSession();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(initialSession);
  const [notice, setNotice] = useState<string | null>(null);

  const signIn = useCallback(async (username: string, password: string) => {
    const next = await login(username, password);
    if (next.user.role !== "GUIDE") {
      throw new Error(GUIDE_ONLY_MESSAGE);
    }
    persistSession(next);
    setNotice(null);
    setSession(next);
    return next.user;
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  useEffect(() => {
    onUnauthorized(() => {
      clearSession();
      setNotice("Tu sesión terminó. Ingresa de nuevo para continuar.");
      setSession(null);
    });
  }, []);

  const value = useMemo(
    () => ({ session, notice, signIn, signOut }),
    [session, notice, signIn, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
