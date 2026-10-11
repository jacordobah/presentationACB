import { lineLength } from "./geometry.js";
import { MINUTE_MS } from "./time.js";

export const MAX_STUDENTS = 30;
export const MAX_TRIP_LENGTH_M = 5500;
export const MAX_ROUTE_LENGTH_M = 11000;
export const CITATION_LEAD_MINUTES = 15;
const MEETING_POINT_RADIUS_M = 50;
const SCHOOL_RADIUS_M = 80;

export const TRIP_CODES = ["541", "542"];

export const CODE_LABELS = {
  58: "Disponible para servicio",
  512: "Informe de novedades",
  520: "Ubicación actual",
  523: "He llegado al sitio",
  524: "Misión cumplida",
  537: "Apoye policía",
  541: "Ruta de confianza hacia el colegio",
  542: "Ruta de confianza salida del colegio",
  550: "Accidente guía en bicicleta",
};

export const ARRIVAL_STATUSES = {
  NON_IMPACT: ["PENDING", "NOTIFIED"],
  IMPACT: ["OPEN", "NOTIFIED", "MINUTED"],
};

export function requiredGuides(studentCount) {
  return studentCount <= 5 ? 1 : 2;
}

export function otherTrip(tripCode) {
  return tripCode === "541" ? "542" : "541";
}

export function classifyArrival(arrivedAt, trip) {
  const lateMs = arrivedAt.getTime() - new Date(trip.citationTime).getTime();
  const minutesLate = Math.max(0, Math.floor(lateMs / MINUTE_MS));
  if (minutesLate < 1) {
    return { classification: "ON_TIME", minutesLate: 0 };
  }
  const classification =
    arrivedAt.getTime() <= new Date(trip.scheduledStart).getTime()
      ? "LATE_NO_IMPACT"
      : "LATE_IMPACT";
  return { classification, minutesLate };
}

// The normative manual sets no action for a single arrival without impact; the
// first one only counts towards the monthly total.
export function arrivalAction(type, accumulatedCount) {
  if (type === "IMPACT") return "REQUIREMENT";
  if (accumulatedCount > 5) return "REQUIREMENT";
  if (accumulatedCount === 5) return "WRITTEN";
  if (accumulatedCount >= 2) return "VERBAL";
  return null;
}

function meetingPointCode(order) {
  return `PE${String(order).padStart(2, "0")}`;
}

// A 541 trip ends at the school, where its line ends; a 542 trip ends at its
// last meeting point.
export function buildGeoTrip({
  routeCode,
  tripCode,
  name,
  coordinates,
  points,
  schoolName,
}) {
  const meetingPoints = points.map((point, index) => ({
    code: meetingPointCode(index + 1),
    name: point.name || `Punto de encuentro ${index + 1}`,
    description: point.description || null,
    radiusM: MEETING_POINT_RADIUS_M,
    location: point.location,
  }));
  const lastPoint = meetingPoints.at(-1);
  const destination =
    tripCode === "541"
      ? {
          name: schoolName,
          radiusM: SCHOOL_RADIUS_M,
          location: coordinates.at(-1),
        }
      : {
          name: lastPoint.name,
          radiusM: lastPoint.radiusM,
          location: lastPoint.location,
        };
  return {
    routeCode,
    tripCode,
    name: name || `${routeCode} ${tripCode} ${CODE_LABELS[tripCode]}`,
    lengthM: Math.round(lineLength(coordinates)),
    coordinates,
    meetingPoints,
    destination,
  };
}
