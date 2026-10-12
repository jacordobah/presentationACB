import { randomBytes } from "node:crypto";
import { bogotaDate } from "./time.js";

export const objectId = () => randomBytes(12).toString("hex");

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
  #geoTrips = new Map();
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

  geoTrip(routeCode, tripCode) {
    return this.#geoTrips.get(`${routeCode}:${tripCode}`);
  }

  geoTrips() {
    return [...this.#geoTrips.values()];
  }

  saveGeoTrip(geoTrip) {
    this.#geoTrips.set(`${geoTrip.routeCode}:${geoTrip.tripCode}`, geoTrip);
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
