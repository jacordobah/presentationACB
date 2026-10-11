import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Clock,
  House,
  Inbox,
  ListTodo,
  Map,
  Route,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "../../api/types";
import type { BadgeKey } from "../../notifications/NotificationsContext";

export interface NavItem {
  to: string;
  label: string;
  title: string;
  icon: LucideIcon;
  exact?: boolean;
  alsoActiveOn?: string;
  inMore?: boolean;
  badge?: BadgeKey;
}

export const NAVIGATION: Record<Role, NavItem[]> = {
  GUIDE: [
    {
      to: "/guide",
      label: "Hoy",
      title: "Hoy",
      icon: House,
      exact: true,
      alsoActiveOn: "/guide/trips",
    },
    {
      to: "/guide/students",
      label: "Estudiantes",
      title: "Estudiantes",
      icon: Users,
    },
    {
      to: "/guide/routes",
      label: "Rutas",
      title: "Proponer ruta",
      icon: Route,
    },
    {
      to: "/guide/attendance",
      label: "Asistencia",
      title: "Asistencia",
      icon: ClipboardCheck,
    },
  ],
  LEADER: [
    { to: "/leader/live", label: "Mapa", title: "Mapa en vivo", icon: Map },
    {
      to: "/leader/routes",
      label: "Rutas",
      title: "Rutas",
      icon: Route,
      alsoActiveOn: "/leader/trips",
    },
    {
      to: "/leader/schedule",
      label: "Programación",
      title: "Programación",
      icon: CalendarDays,
      inMore: true,
    },
    {
      to: "/leader/reports",
      label: "Novedades",
      title: "Novedades",
      icon: Bell,
      badge: "reports",
    },
    {
      to: "/leader/arrivals",
      label: "Llegadas",
      title: "Llegadas fuera de programación",
      icon: Clock,
      badge: "arrivals",
      inMore: true,
    },
    {
      to: "/leader/pending",
      label: "Pendientes",
      title: "Pendientes",
      icon: ListTodo,
    },
  ],
  MANAGER: [
    {
      to: "/manager/requests",
      label: "Solicitudes",
      title: "Solicitudes",
      icon: Inbox,
    },
    { to: "/manager/live", label: "Mapa", title: "Mapa en vivo", icon: Map },
    { to: "/manager/routes", label: "Rutas", title: "Rutas", icon: Route },
    {
      to: "/manager/admin",
      label: "Gestión",
      title: "Gestión",
      icon: Building2,
      inMore: true,
    },
    {
      to: "/manager/reports",
      label: "Novedades",
      title: "Novedades",
      icon: Bell,
      badge: "reports",
    },
    {
      to: "/manager/arrivals",
      label: "Llegadas",
      title: "Llegadas fuera de programación",
      icon: Clock,
      badge: "arrivals",
      inMore: true,
    },
  ],
};

export function isNavItemActive(item: NavItem, pathname: string) {
  const matches = (base: string) =>
    pathname === base || pathname.startsWith(`${base}/`);
  if (item.alsoActiveOn && matches(item.alsoActiveOn)) return true;
  return item.exact ? pathname === item.to : matches(item.to);
}
