import express from "express";
import multer from "multer";
import { authenticate, canAccessRoute, scopedZone } from "./auth.js";
import { distanceMeters, formatKilometers } from "./geometry.js";
import {
  errorHandler,
  forbidden,
  notFound,
  notFoundHandler,
  requestLogger,
  unprocessable,
} from "./http.js";
import { readKmz } from "./kmz.js";
import {
  arrivalAction,
  buildGeoTrip,
  classifyArrival,
  CODE_LABELS,
  MAX_ROUTE_LENGTH_M,
  MAX_TRIP_LENGTH_M,
  otherTrip,
  requiredGuides,
  TRIP_CODES,
} from "./rules.js";
import { objectId, zoneOf } from "./store.js";
import { bogotaDate, isDateString } from "./time.js";
import {
  optionalText,
  requiredNumber,
  requiredOneOf,
  requiredText,
} from "./validation.js";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const toBody = (detail) => ({ detail });
const photoUrl = (id) => `/api/v1/photos/${id}`;
const toPoint = ([lng, lat]) => ({ type: "Point", coordinates: [lng, lat] });

function toGeoTripDto(geoTrip) {
  return {
    route_code: geoTrip.routeCode,
    trip_code: geoTrip.tripCode,
    name: geoTrip.name,
    length_m: geoTrip.lengthM,
    geometry: { type: "LineString", coordinates: geoTrip.coordinates },
    meeting_points: geoTrip.meetingPoints.map((point, index) => ({
      code: point.code,
      order: index + 1,
      name: point.name,
      description: point.description,
      radius_m: point.radiusM,
      location: toPoint(point.location),
    })),
    destination: {
      name: geoTrip.destination.name,
      radius_m: geoTrip.destination.radiusM,
      location: toPoint(geoTrip.destination.location),
    },
  };
}

function parseInstant(value, fallback) {
  const instant = typeof value === "string" ? new Date(value) : null;
  return instant && !Number.isNaN(instant.getTime()) ? instant : fallback;
}

export function createGeoApp(store) {
  const app = express();
  const api = express.Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES },
  });
  app.disable("x-powered-by");
  app.use(requestLogger("geo"));
  app.use(express.json());
  api.use(
    authenticate(store, (res) =>
      res
        .status(401)
        .json(toBody("Tu sesión no es válida o expiró. Ingresa de nuevo.")),
    ),
  );

  const findRoute = (user, code) => {
    const route = store.route(code);
    if (!route || !canAccessRoute(user, route))
      throw notFound(`La ruta ${code} no existe.`);
    return route;
  };

  const ensureSessionUser = (body, user) => {
    if (String(body?.user_id) !== String(user.id)) {
      throw forbidden("El user_id no corresponde a la sesión iniciada.");
    }
  };

  api.get("/routes", (req, res) => {
    const { zone, route_code: routeCode, trip_code: tripCode } = req.query;
    const geoTrips = store
      .geoTrips()
      .filter(
        (geoTrip) =>
          (!zone || zoneOf(geoTrip.routeCode) === zone) &&
          (!routeCode || geoTrip.routeCode === routeCode) &&
          (!tripCode || geoTrip.tripCode === tripCode),
      )
      .sort(
        (a, b) =>
          a.routeCode.localeCompare(b.routeCode) ||
          a.tripCode.localeCompare(b.tripCode),
      );
    res.json(geoTrips.map(toGeoTripDto));
  });

  api.post("/imports/kmz", upload.single("file"), async (req, res) => {
    const routeCode = requiredText(
      req.body,
      "route_code",
      "el código de la ruta",
    );
    const tripCode = requiredOneOf(
      req.body,
      "trip_code",
      TRIP_CODES,
      "el recorrido 541 o 542",
    );
    const route = findRoute(req.user, routeCode);
    if (route.status === "IN_REVIEW") {
      throw unprocessable(
        "La ruta está en revisión. Espera la respuesta antes de cambiar el trazado.",
      );
    }
    if (!req.file) throw unprocessable("Adjunta el archivo KMZ del recorrido.");

    const { line, points } = await readKmz(req.file.buffer);
    if (!line || line.coordinates.length < 2) {
      throw unprocessable(
        "El KMZ no tiene una línea con el trazado del recorrido.",
      );
    }
    if (points.length === 0)
      throw unprocessable("El KMZ no tiene puntos de encuentro.");

    const geoTrip = buildGeoTrip({
      routeCode,
      tripCode,
      name: line.name,
      coordinates: line.coordinates,
      points,
      schoolName: store.school(route.schoolId)?.name ?? "Colegio",
    });
    if (geoTrip.lengthM > MAX_TRIP_LENGTH_M) {
      throw unprocessable(
        `El recorrido ${tripCode} mide ${formatKilometers(geoTrip.lengthM)} y supera el máximo de ${formatKilometers(MAX_TRIP_LENGTH_M)}.`,
      );
    }
    const other = store.geoTrip(routeCode, otherTrip(tripCode));
    if (other && geoTrip.lengthM + other.lengthM > MAX_ROUTE_LENGTH_M) {
      throw unprocessable(
        `Los recorridos 541 y 542 suman ${formatKilometers(geoTrip.lengthM + other.lengthM)} y superan el máximo de ${formatKilometers(MAX_ROUTE_LENGTH_M)}.`,
      );
    }
    store.saveGeoTrip(geoTrip);
    res.status(201).json({
      message: `KMZ del recorrido ${tripCode} importado.`,
      import_id: objectId(),
      saved_routes: 1,
      saved_points: points.length,
    });
  });

  api.post("/status/notify", (req, res) => {
    const { user } = req;
    ensureSessionUser(req.body, user);
    const status = requiredOneOf(
      req.body,
      "status",
      Object.keys(CODE_LABELS),
      "un código operativo válido",
    );
    const report = {
      name: requiredText(req.body, "name", "el nombre del código"),
      route: findRoute(user, requiredText(req.body, "route", "la ruta")).code,
      tripCode: requiredOneOf(
        req.body,
        "trip_code",
        TRIP_CODES,
        "el recorrido 541 o 542",
      ),
      status,
      userId: user.id,
      latitude: requiredNumber(req.body, "latitude", "la latitud"),
      longitude: requiredNumber(req.body, "longitude", "la longitud"),
      detail: optionalText(req.body, "detail"),
      photoId: optionalText(req.body, "photo_id"),
    };
    if (report.photoId && !store.photos.has(report.photoId)) {
      throw unprocessable("La foto adjunta no existe. Tómala de nuevo.");
    }

    const now = new Date();
    const today = bogotaDate(now);
    const trip = store.tripFor(report.route, report.tripCode, today);
    let arrival;
    switch (status) {
      case "523":
        arrival = registerArrival(store, user, trip, report, now);
        break;
      case "541":
      case "542":
        ensureTripCanStart(store, trip, report);
        break;
      case "512":
        if (!report.detail)
          throw unprocessable("Describe la novedad para enviar el informe.");
        break;
      case "524":
        ensureDayFinished(store, user, today);
        break;
      case "58":
        if (
          !store
            .reportsFor({ date: today, status: "524" })
            .some((r) => r.userId === user.id)
        ) {
          throw unprocessable("Primero reporta misión cumplida (524).");
        }
        break;
    }

    store.addReport({
      ...report,
      notifiedAt: parseInstant(req.body.notified_at, now).toISOString(),
    });
    res.status(201).json({
      message: `Código ${status} registrado.`,
      ...(arrival && { arrival }),
    });
  });

  api.get("/status", (req, res) => {
    const date = isDateString(req.query.date) ? req.query.date : bogotaDate();
    const zone = scopedZone(req.user, req.query.zone);
    const reports = store
      .reportsFor({ routeCode: req.query.route, date })
      .filter(
        (report) =>
          (!zone || zoneOf(report.route) === zone) &&
          canAccessRoute(req.user, store.route(report.route)),
      )
      .sort((a, b) => b.notifiedAt.localeCompare(a.notifiedAt));
    res.json(
      reports.map((report) => ({
        id: report.id,
        name: report.name,
        route: report.route,
        trip_code: report.tripCode,
        status: report.status,
        user_id: String(report.userId),
        user_name: store.user(report.userId)?.name ?? null,
        notified_at: report.notifiedAt,
        latitude: report.latitude,
        longitude: report.longitude,
        detail: report.detail,
        photo_url: report.photoId ? photoUrl(report.photoId) : null,
      })),
    );
  });

  api.post("/positions", (req, res) => {
    ensureSessionUser(req.body, req.user);
    const accuracy = req.body.accuracy;
    store.setPosition({
      userId: req.user.id,
      route: requiredText(req.body, "route", "la ruta"),
      tripCode: requiredOneOf(
        req.body,
        "trip_code",
        TRIP_CODES,
        "el recorrido 541 o 542",
      ),
      latitude: requiredNumber(req.body, "latitude", "la latitud"),
      longitude: requiredNumber(req.body, "longitude", "la longitud"),
      accuracy:
        typeof accuracy === "number" && Number.isFinite(accuracy)
          ? accuracy
          : null,
      recordedAt: parseInstant(req.body.recorded_at, new Date()).toISOString(),
    });
    res.status(204).end();
  });

  api.get("/positions/latest", (req, res) => {
    const zone = scopedZone(req.user, req.query.zone);
    const activeTrips = store
      .tripsOn(bogotaDate())
      .filter((trip) => trip.status === "IN_PROGRESS");
    const positions = [...store.positions.values()].filter(
      (position) =>
        (!zone || zoneOf(position.route) === zone) &&
        activeTrips.some(
          (trip) =>
            trip.routeCode === position.route &&
            trip.tripCode === position.tripCode,
        ),
    );
    res.json(
      positions.map((position) => ({
        user_id: String(position.userId),
        user_name: store.user(position.userId)?.name ?? null,
        route: position.route,
        trip_code: position.tripCode,
        latitude: position.latitude,
        longitude: position.longitude,
        recorded_at: position.recordedAt,
      })),
    );
  });

  api.post("/photos", upload.single("file"), (req, res) => {
    if (!req.file) throw unprocessable("Adjunta la foto.");
    if (!req.file.mimetype.startsWith("image/"))
      throw unprocessable("El archivo debe ser una imagen.");
    const id = objectId();
    store.photos.set(id, {
      id,
      userId: req.user.id,
      route: optionalText(req.body, "route"),
      tripCode: optionalText(req.body, "trip_code"),
      status: optionalText(req.body, "status"),
      contentType: req.file.mimetype,
      data: req.file.buffer,
      uploadedAt: new Date().toISOString(),
    });
    res.status(201).json({ id, url: photoUrl(id) });
  });

  api.get("/photos/:id", (req, res) => {
    const photo = store.photos.get(req.params.id);
    if (!photo) throw notFound("La foto no existe.");
    res
      .set("Cache-Control", "private, max-age=86400")
      .type(photo.contentType)
      .send(photo.data);
  });

  app.use("/api/v1", api);
  app.use(notFoundHandler(toBody));
  app.use(errorHandler(toBody));
  return app;
}

function registerArrival(store, user, trip, report, now) {
  if (!trip)
    throw unprocessable("No hay un recorrido programado hoy para esta ruta.");
  if (trip.status === "FINISHED")
    throw unprocessable("Este recorrido ya finalizó.");
  const reported = store
    .reportsFor({
      routeCode: trip.routeCode,
      tripCode: trip.tripCode,
      date: trip.date,
      status: "523",
    })
    .some((existing) => existing.userId === user.id);
  if (reported)
    throw unprocessable("Ya reportaste tu llegada a este recorrido.");

  const firstPoint = store.geoTrip(trip.routeCode, trip.tripCode)
    .meetingPoints[0];
  const distance = distanceMeters(
    [report.longitude, report.latitude],
    firstPoint.location,
  );
  if (distance > firstPoint.radiusM) {
    throw unprocessable(
      `Estás a ${Math.round(distance)} m del ${firstPoint.code}. Acércate al punto para reportar tu llegada.`,
    );
  }
  if (!report.photoId)
    throw unprocessable("Toma la selfie para reportar tu llegada.");

  // Punctuality uses the server clock, not the time the device claims.
  const { classification, minutesLate } = classifyArrival(now, trip);
  if (classification !== "ON_TIME" && user.role === "GUIDE") {
    const type = classification === "LATE_IMPACT" ? "IMPACT" : "NON_IMPACT";
    const accumulatedCount =
      store.monthlyArrivals(user.id, type, trip.date) + 1;
    store.addArrival({
      guideId: user.id,
      routeCode: trip.routeCode,
      tripId: trip.id,
      date: trip.date,
      type,
      minutesLate,
      status: type === "IMPACT" ? "OPEN" : "PENDING",
      accumulatedCount,
      action: arrivalAction(type, accumulatedCount),
      createdAt: now.toISOString(),
    });
  }
  return {
    arrived_at: now.toISOString(),
    classification,
    minutes_late: minutesLate,
  };
}

function ensureTripCanStart(store, trip, report) {
  if (!trip)
    throw unprocessable("No hay un recorrido programado hoy para esta ruta.");
  if (report.status !== report.tripCode) {
    throw unprocessable(
      `El código ${report.status} no corresponde al recorrido ${report.tripCode}.`,
    );
  }
  if (trip.status === "FINISHED")
    throw unprocessable("Este recorrido ya finalizó.");
  const arrived = new Set(
    store
      .reportsFor({
        routeCode: trip.routeCode,
        tripCode: trip.tripCode,
        date: trip.date,
        status: "523",
      })
      .map((existing) => existing.userId),
  );
  const required = requiredGuides(store.activeStudents(trip.routeCode).length);
  if (arrived.size < required) {
    throw unprocessable(
      `Para iniciar se necesitan ${required} llegadas (523) y hay ${arrived.size}.`,
    );
  }
}

function ensureDayFinished(store, user, today) {
  const trips = store
    .tripsOn(today)
    .filter(
      (trip) =>
        trip.executorIds.includes(user.id) ||
        store.isAssignedGuide(user.id, trip.routeCode),
    );
  if (trips.length === 0 || trips.some((trip) => trip.status !== "FINISHED")) {
    throw unprocessable(
      "Reporta misión cumplida cuando hayas finalizado todos tus recorridos del día.",
    );
  }
}
