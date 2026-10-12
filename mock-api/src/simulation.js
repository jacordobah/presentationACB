import { pointAlong, stopDistances } from "./geometry.js";
import { CODE_LABELS } from "./rules.js";
import { addMinutes, bogotaDate } from "./time.js";

const TICK_MS = 5_000;
const SPEED_MPS = 12 / 3.6;
const STOP_MS = 60_000;
const RESTART_PAUSE_MS = 90_000;
const NOVELTY_STOP = 1;

const CARAVANS = [
  { routeCode: "MM02", tripCode: "541", progress: 0.45 },
  { routeCode: "KE01", tripCode: "541", progress: 0.2 },
];

const NOVELTIES = [
  "Un estudiante olvidó el casco. Le prestamos uno de reserva y seguimos.",
  "Hay obra en la vía. Tomamos el desvío señalizado y vamos a tiempo.",
  "Una estudiante se sintió mareada. Paramos dos minutos, se recuperó y continuamos.",
  "Se soltó la cadena de una bicicleta. La ajustamos en el punto y seguimos.",
];

export function startSimulation(store, startedAt) {
  const today = bogotaDate(startedAt);
  scheduleArrival(
    store,
    "guia2",
    store.tripFor("MM01", "541", today),
    addMinutes(startedAt, 2),
  );
  const afternoon = store.tripFor("MM01", "542", today);
  scheduleArrival(
    store,
    "guia2",
    afternoon,
    addMinutes(afternoon.citationTime, -5),
  );

  const caravans = CARAVANS.map(
    ({ routeCode, tripCode, progress }, index) =>
      new Caravan(
        store,
        store.tripFor(routeCode, tripCode, today),
        progress,
        index,
      ),
  );
  const tick = () => {
    const now = Date.now();
    for (const caravan of caravans) caravan.tick(now);
  };
  tick();
  setInterval(tick, TICK_MS);
}

// Stands in for the second MM01 guide so the person running the demo only needs
// their own 523.
function scheduleArrival(store, username, trip, at) {
  setTimeout(
    () => {
      const user = store.userByUsername(username);
      if (!user.active || trip.status !== "SCHEDULED") return;
      if (!store.isAssignedGuide(user.id, trip.routeCode)) return;
      const reported = store
        .reportsFor({
          routeCode: trip.routeCode,
          tripCode: trip.tripCode,
          date: trip.date,
          status: "523",
        })
        .some((report) => report.userId === user.id);
      if (reported) return;
      const [longitude, latitude] = store.geoTrip(trip.routeCode, trip.tripCode)
        .meetingPoints[0].location;
      store.addReport({
        name: CODE_LABELS[523],
        route: trip.routeCode,
        tripCode: trip.tripCode,
        status: "523",
        userId: user.id,
        notifiedAt: new Date().toISOString(),
        latitude: latitude + 0.00004,
        longitude: longitude - 0.00003,
        detail: null,
        photoId: null,
      });
    },
    Math.max(0, at.getTime() - Date.now()),
  );
}

// Moves a trip along its line at riding speed, waits at each meeting point and
// starts over after reaching the destination, so the live maps always show
// movement.
class Caravan {
  constructor(store, trip, progress, index) {
    this.store = store;
    this.trip = trip;
    this.index = index;
    this.follow(store.geoTrip(trip.routeCode, trip.tripCode));
    this.distance = this.length * progress;
    this.nextStop = this.stops.findIndex((stop) => stop > this.distance);
    if (this.nextStop === -1) this.nextStop = this.stops.length;
    this.phase = "riding";
    this.resumeAt = 0;
    this.lastTickAt = Date.now();
    this.loop = 0;

    for (let stop = 0; stop < this.nextStop; stop++) this.takeAttendance(stop);
  }

  follow(geoTrip) {
    this.importId = geoTrip.importId;
    this.coordinates = geoTrip.coordinates;
    this.meetingPoints = geoTrip.meetingPoints;
    this.length = geoTrip.lengthM;
    this.stops = stopDistances(
      this.coordinates,
      this.meetingPoints.map((point) => point.location),
    );
  }

  tick(now) {
    const elapsedSeconds = (now - this.lastTickAt) / 1000;
    this.lastTickAt = now;
    if (this.trip.status !== "IN_PROGRESS") return;

    // A new KMZ replaces the trip's line, so the caravan starts over on it.
    const geoTrip = this.store.geoTrip(this.trip.routeCode, this.trip.tripCode);
    if (geoTrip.importId !== this.importId) {
      this.follow(geoTrip);
      this.restart();
    }

    if (this.phase !== "riding" && now >= this.resumeAt) {
      if (this.phase === "arrived") this.restart();
      else this.phase = "riding";
    }
    if (this.phase === "riding") this.ride(elapsedSeconds, now);
    this.publishPosition(now);
  }

  ride(elapsedSeconds, now) {
    const target = this.distance + SPEED_MPS * elapsedSeconds;
    const stop = this.stops[this.nextStop];
    if (stop !== undefined && target >= stop) {
      this.distance = stop;
      this.phase = "stopped";
      this.resumeAt = now + STOP_MS;
      this.arriveAtStop(this.nextStop, now);
      this.nextStop++;
    } else if (target >= this.length) {
      this.distance = this.length;
      this.phase = "arrived";
      this.resumeAt = now + RESTART_PAUSE_MS;
      this.report("520", now);
    } else {
      this.distance = target;
    }
  }

  restart() {
    this.distance = 0;
    this.nextStop = 0;
    this.phase = "riding";
    this.loop++;
  }

  arriveAtStop(stop, now) {
    if (this.loop === 0) this.takeAttendance(stop);
    if (stop === NOVELTY_STOP) {
      this.report(
        "512",
        now,
        NOVELTIES[
          (this.loop * CARAVANS.length + this.index) % NOVELTIES.length
        ],
      );
    }
  }

  takeAttendance(stop) {
    const { code } = this.meetingPoints[stop];
    const students = this.store
      .activeStudents(this.trip.routeCode)
      .filter((student) =>
        this.trip.tripCode === "541"
          ? student.meetingPoints[541] === code
          : stop === 0,
      );
    if (students.length === 0) return;
    this.store.recordAttendance(
      this.trip,
      code,
      students.map((student) => ({
        studentId: student.id,
        present: Math.random() < 0.92,
      })),
      new Date().toISOString(),
    );
  }

  get location() {
    return pointAlong(this.coordinates, this.distance);
  }

  publishPosition(now) {
    const [longitude, latitude] = this.location;
    for (const userId of this.trip.executorIds) {
      this.store.setPosition({
        userId,
        route: this.trip.routeCode,
        tripCode: this.trip.tripCode,
        latitude,
        longitude,
        accuracy: 8,
        recordedAt: new Date(now).toISOString(),
      });
    }
  }

  report(status, now, detail = null) {
    const [longitude, latitude] = this.location;
    this.store.addReport({
      name: CODE_LABELS[status],
      route: this.trip.routeCode,
      tripCode: this.trip.tripCode,
      status,
      userId: this.trip.executorIds[0],
      notifiedAt: new Date(now).toISOString(),
      latitude,
      longitude,
      detail,
      photoId: null,
    });
  }
}
