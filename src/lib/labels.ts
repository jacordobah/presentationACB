import type {
  ArrivalAction,
  ArrivalStatus,
  ArrivalType,
  DocumentType,
  Punctuality,
  Relationship,
  Role,
  RouteStatus,
  SchoolShift,
  TripCode,
  TripStatus,
} from "../api/types";

export const ROLE_LABELS: Record<Role, string> = {
  GUIDE: "Guía escolar",
  LEADER: "Líder zonal",
  MANAGER: "Gerente operativo",
};

export const TRIP_LABELS: Record<TripCode, string> = {
  "541": "Hacia el colegio",
  "542": "Salida del colegio",
};

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  SCHEDULED: "Programado",
  IN_PROGRESS: "En curso",
  FINISHED: "Finalizado",
};

export const ROUTE_STATUS_LABELS: Record<RouteStatus, string> = {
  DRAFT: "Borrador",
  IN_REVIEW: "En revisión",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  CC: "Cédula de ciudadanía",
  CE: "Cédula de extranjería",
  NUIP: "Número único de identificación personal",
  PPT: "Permiso por protección temporal",
  PPE: "Permiso especial de permanencia",
};

export const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  MOTHER: "Madre",
  FATHER: "Padre",
  UNCLE_AUNT: "Tío o tía",
  RELATIVE: "Otro familiar",
  NEIGHBOR: "Vecino o vecina",
};

export const SCHOOL_SHIFT_LABELS: Record<SchoolShift, string> = {
  MORNING: "Mañana",
  AFTERNOON: "Tarde",
  FULL_DAY: "Única",
};

export const ARRIVAL_TYPE_LABELS: Record<ArrivalType, string> = {
  NON_IMPACT: "Sin afectación",
  IMPACT: "Con afectación",
};

export const ARRIVAL_STATUS_LABELS: Record<ArrivalStatus, string> = {
  PENDING: "Pendiente",
  NOTIFIED: "Notificada",
  OPEN: "Abierta",
  MINUTED: "Con acta",
};

export const ARRIVAL_STATUSES_BY_TYPE: Record<ArrivalType, ArrivalStatus[]> = {
  NON_IMPACT: ["PENDING", "NOTIFIED"],
  IMPACT: ["OPEN", "NOTIFIED", "MINUTED"],
};

export const PUNCTUALITY_LABELS: Record<Punctuality, string> = {
  ON_TIME: "Llegaste a tiempo",
  LATE_NO_IMPACT: "Llegada tarde sin afectación",
  LATE_IMPACT: "Llegada tarde con afectación",
};

export function arrivalActionLabel(
  type: ArrivalType,
  action: ArrivalAction | null,
) {
  if (type === "IMPACT") return "Requerimiento por afectación directa";
  switch (action) {
    case "VERBAL":
      return "Llamado verbal con notificación al correo";
    case "WRITTEN":
      return "Llamado por escrito (acta con el líder)";
    case "REQUIREMENT":
      return "Requerimiento de la supervisión";
    default:
      return "Sin acción todavía";
  }
}

export function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
