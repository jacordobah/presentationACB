import { randomBytes } from "node:crypto";
import { buildGeoTrip } from "./rules.js";
import { bogotaDate } from "./time.js";

const PROCESS_ID = randomBytes(5).toString("hex");
let objectCount = 0;

// Laid out like a MongoDB ObjectId (creation second, process and counter), so
// later ids sort after earlier ones.
export function objectId() {
  objectCount = (objectCount + 1) % 0x1000000;
  const seconds = Math.floor(Date.now() / 1000);
  return [
    seconds.toString(16).padStart(8, "0"),
    PROCESS_ID,
    objectCount.toString(16).padStart(6, "0"),
  ].join("");
}

export const zoneOf = (routeCode) => routeCode.slice(0, 2);

export class Store {
  zones = [];
  users = [];
  schools = [];
  routes = [];
  students = [];
  trips = [];
  attendance = [];
  arrivals = [];
  reports = [];
  photos = new Map();
  positions = new Map();
  geoRoutes = [];
  geoMeetingPoints = [];
  #sequences = new Map();

  nextId(kind) {
    const next = (this.#sequences.get(kind) ?? 0) + 1;
    this.#sequences.set(kind, next);
    return next;
  }

  user(id) {
    return this.users.find((user) => user.id === id);
  }

  userByUsername(username) {
    return this.users.find((user) => user.username === username);
  }

  school(id) {
    return this.schools.find((school) => school.id === id);
  }

  route(code) {
    return this.routes.find((route) => route.code === code);
  }

  student(id) {
    return this.students.find((student) => student.id === id);
  }

  trip(id) {
    return this.trips.find((trip) => trip.id === id);
  }

  activeStudents(routeCode) {
    return this.students.filter(
      (student) => student.routeCode === routeCode && student.active,
    );
  }

  isAssignedGuide(userId, routeCode) {
    return (
      this.route(routeCode)?.guides.some((guide) => guide.guideId === userId) ??
      false
    );
  }

  // Like geolocaACB, every import stays stored; the latest import of a trip is
  // its current geometry.
  geoTrip(routeCode, tripCode) {
    const latest = this.geoRoutes.findLast(
      (route) => route.route_code === routeCode && route.trip_code === tripCode,
    );
    if (!latest) return undefined;
    const points = this.geoMeetingPoints.filter(
      (point) => point.import_id === latest.import_id,
    );
    return {
      importId: latest.import_id,
      ...buildGeoTrip({
        routeCode,
        tripCode,
        name: latest.name,
        coordinates: latest.geometry.coordinates,
        points: points.map((point) => ({
          name: point.name,
          description: point.description,
          location: point.location.coordinates,
        })),
        schoolName: this.school(this.route(routeCode).schoolId).name,
      }),
    };
  }

  saveImport({ routeCode, tripCode, name, coordinates, meetingPoints }) {
    const origin = {
      import_id: objectId(),
      route_code: routeCode,
      trip_code: tripCode,
    };
    this.geoRoutes.push({
      _id: objectId(),
      ...origin,
      name,
      geometry: { type: "LineString", coordinates },
    });
    for (const point of meetingPoints) {
      this.geoMeetingPoints.push({
        _id: objectId(),
        ...origin,
        name: point.name,
        description: point.description,
        location: { type: "Point", coordinates: point.location },
      });
    }
    return origin.import_id;
  }

  tripsOn(date) {
    return this.trips.filter((trip) => trip.date === date);
  }

  tripFor(routeCode, tripCode, date) {
    return this.trips.find(
      (trip) =>
        trip.routeCode === routeCode &&
        trip.tripCode === tripCode &&
        trip.date === date,
    );
  }

  reportsFor({ routeCode, tripCode, date, status }) {
    return this.reports.filter(
      (report) =>
        (!routeCode || report.route === routeCode) &&
        (!tripCode || report.tripCode === tripCode) &&
        (!date || report.date === date) &&
        (!status || report.status === status),
    );
  }

  addReport(report) {
    const saved = {
      id: objectId(),
      date: bogotaDate(new Date(report.notifiedAt)),
      ...report,
    };
    this.reports.push(saved);
    return saved;
  }

  addArrival(arrival) {
    const saved = { id: this.nextId("arrival"), ...arrival };
    this.arrivals.push(saved);
    return saved;
  }

  monthlyArrivals(guideId, type, date) {
    const month = date.slice(0, 7);
    return this.arrivals.filter(
      (arrival) =>
        arrival.guideId === guideId &&
        arrival.type === type &&
        arrival.date.startsWith(month),
    ).length;
  }

  recordAttendance(trip, meetingPointCode, records, recordedAt) {
    for (const { studentId, present } of records) {
      const existing = this.attendance.find(
        (entry) => entry.tripId === trip.id && entry.studentId === studentId,
      );
      if (existing) {
        Object.assign(existing, { meetingPointCode, present, recordedAt });
      } else {
        this.attendance.push({
          tripId: trip.id,
          studentId,
          meetingPointCode,
          present,
          recordedAt,
        });
      }
    }
  }

  setPosition(position) {
    this.positions.set(position.userId, position);
  }
}
