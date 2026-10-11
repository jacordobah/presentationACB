import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import type { Role } from "../api/types";
import { HOME_PATHS, useAuth } from "./AuthContext";

export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (session.user.role !== role) {
    return <Navigate to={HOME_PATHS[session.user.role]} replace />;
  }
  return children;
}

export function HomeRedirect() {
  const { session } = useAuth();
  return (
    <Navigate to={session ? HOME_PATHS[session.user.role] : "/login"} replace />
  );
}
