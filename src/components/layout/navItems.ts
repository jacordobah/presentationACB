import { ClipboardCheck, House, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  title: string;
  icon: LucideIcon;
  exact?: boolean;
  alsoActiveOn?: string;
}

export const NAVIGATION: NavItem[] = [
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
    to: "/guide/attendance",
    label: "Asistencia",
    title: "Asistencia",
    icon: ClipboardCheck,
  },
];

export function isNavItemActive(item: NavItem, pathname: string) {
  const matches = (base: string) =>
    pathname === base || pathname.startsWith(`${base}/`);
  if (item.alsoActiveOn && matches(item.alsoActiveOn)) return true;
  return item.exact ? pathname === item.to : matches(item.to);
}
