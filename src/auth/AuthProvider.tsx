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

const initialSession = restoreSession();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(initialSession);
  const [notice, setNotice] = useState<string | null>(null);

  const signIn = useCallback(async (username: string, password: string) => {
    const next = await login(username, password);
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
