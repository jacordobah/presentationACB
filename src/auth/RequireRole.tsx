import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { HOME_PATH, useAuth } from "./AuthContext";

export function RequireGuide({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (session.user.role !== "GUIDE") {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function HomeRedirect() {
  const { session } = useAuth();
  return <Navigate to={session ? HOME_PATH : "/login"} replace />;
}
