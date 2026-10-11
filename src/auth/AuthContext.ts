import { createContext, useContext } from "react";
import type { Session } from "../api/auth";
import type { Role, SessionUser } from "../api/types";

export interface AuthContextValue {
  session: Session | null;
  notice: string | null;
  signIn: (username: string, password: string) => Promise<SessionUser>;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function useSessionUser() {
  const { session } = useAuth();
  if (!session) throw new Error("useSessionUser requires a signed-in user");
  return session.user;
}

export const HOME_PATHS: Record<Role, string> = {
  GUIDE: "/guide",
  LEADER: "/leader/live",
  MANAGER: "/manager/requests",
};
