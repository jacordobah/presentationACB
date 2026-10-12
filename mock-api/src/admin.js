import express from "express";
import {
  authenticate,
  canAccessRoute,
  canOperateTrip,
  issueToken,
  requireRole,
  scopedZone,
} from "./auth.js";
import {
  errorHandler,
  forbidden,
  notFound,
  notFoundHandler,
  requestLogger,
  unauthorized,
  unprocessable,
} from "./http.js";
import {
  ARRIVAL_STATUSES,
  MAX_ROUTE_LENGTH_M,
  MAX_STUDENTS,
  MAX_TRIP_LENGTH_M,
  requiredGuides,
  TRIP_CODES,
} from "./rules.js";
import { zoneOf } from "./store.js";
import { bogotaDate, isDateString } from "./time.js";
import {
  optionalText,
  requiredDocumentNumber,
  requiredEmail,
  requiredNumber,
  requiredOneOf,
  requiredPhone,
  requiredText,
} from "./validation.js";

const DOCUMENT_TYPES = ["CC", "CE", "NUIP", "PPT", "PPE"];
const RELATIONSHIPS = [
  "FATHER",
  "MOTHER",
  "UNCLE_AUNT",
  "RELATIVE",
  "NEIGHBOR",
];
const SCHOOL_SHIFTS = ["MORNING", "AFTERNOON", "FULL_DAY"];
const ROUTE_CODE = /^[A-Z]{2}\d{2}$/;

const toBody = (message) => ({ message });

export function createAdminApp(store) {
  const app = express();
  const api = express.Router();
  app.disable("x-powered-by");
  app.use(requestLogger("admin"));
  app.use(express.json());

  api.post("/auth/login", (req, res) => {
    const user = store.userByUsername(optionalText(req.body, "username") ?? "");
    if (!user?.active || user.password !== req.body?.password) {
      throw unauthorized("Usuario o contraseña incorrectos.");
    }
    res.json({
      token: issueToken(user),
      user: { id: user.id, name: user.name, role: user.role, zone: user.zone },
    });
  });

  // Spring Security answers a missing, invalid or expired token with an empty
  // 401 before any controller runs.
  api.use(
    authenticate(store, (res) =>
      res.status(401).set("WWW-Authenticate", "Bearer").end(),
    ),
  );
  api.get("/zones", (req, res) => res.json(store.zones));
  registerSchools(api, store);
  registerStaff(api, store, "guides", "GUIDE");
  registerStaff(api, store, "leaders", "LEADER");
  registerRoutes(api, store);
  registerStudents(api, store);
  registerTrips(api, store);
  registerArrivals(api, store);

  app.use("/api/v1", api);
  app.use(notFoundHandler(toBody));
  app.use(errorHandler(toBody));
  return app;
}

const zoneCodes = (store) => store.zones.map((zone) => zone.code);

function registerSchools(api, store) {
  const findSchool = (id) => {
    const school = store.school(Number(id));
    if (!school) throw notFound("El colegio no existe.");
    return school;
  };

  const readSchool = (body) => ({
    name: requiredText(body, "name", "el nombre del colegio"),
    schoolCode: requiredText(body, "schoolCode", "el código DANE"),
    phone: requiredPhone(body, "phone"),
    address: requiredText(body, "address", "la dirección"),
    zone: requiredOneOf(body, "zone", zoneCodes(store), "una zona válida"),
    latitude: requiredNumber(body, "latitude", "la latitud"),
    longitude: requiredNumber(body, "longitude", "la longitud"),
  });

  api.get("/schools", (req, res) => {
    const zone = scopedZone(req.user, req.query.zone);
    res.json(store.schools.filter((school) => !zone || school.zone === zone));
  });

  api.post("/schools", requireRole("MANAGER"), (req, res) => {
    const school = {
      id: store.nextId("school"),
      ...readSchool(req.body),
      active: true,
    };
    store.schools.push(school);
    res.status(201).json(school);
  });

  api.put("/schools/:id", requireRole("MANAGER"), (req, res) => {
    const school = findSchool(req.params.id);
    Object.assign(school, readSchool(req.body));
    res.json(school);
  });

  api.delete("/schools/:id", requireRole("MANAGER"), (req, res) => {
    findSchool(req.params.id).active = false;
    res.status(204).end();
  });
}

function toPersonDto(user) {
  return {
    id: user.id,
    documentType: user.documentType,
    documentNumber: user.documentNumber,
    name: user.name,
    address: user.address,
    email: user.email,
    phone: user.phone,
    zone: user.zone,
    contractNumber: user.contractNumber,
    username: user.username,
    active: user.active,
  };
}

function registerStaff(api, store, path, role) {
  const findPerson = (id) => {
    const user = store.user(Number(id));
    if (user?.role !== role) throw notFound("La persona no existe.");
    return user;
  };

  const readPerson = (body, current) => {
    const person = {
      documentType: requiredOneOf(
        body,
        "documentType",
        DOCUMENT_TYPES,
        "un tipo de documento válido",
      ),
      documentNumber: requiredDocumentNumber(body, "documentNumber"),
      name: requiredText(body, "name", "el nombre"),
      address: requiredText(body, "address", "la dirección"),
      email: requiredEmail(body, "email"),
      phone: requiredPhone(body, "phone"),
      zone: requiredOneOf(body, "zone", zoneCodes(store), "una zona válida"),
      contractNumber: requiredText(
        body,
        "contractNumber",
        "el número de contrato",
      ),
      username: requiredText(body, "username", "el usuario"),
    };
    if (
      store.users.some(
        (user) => user.username === person.username && user !== current,
      )
    ) {
      throw unprocessable(
        `El usuario ${person.username} ya existe. Elige otro.`,
      );
    }
    return person;
  };

  const allowedRoles = role === "GUIDE" ? ["LEADER", "MANAGER"] : ["MANAGER"];

  api.get(`/${path}`, requireRole(...allowedRoles), (req, res) => {
    const zone = scopedZone(req.user, req.query.zone);
    const people = store.users.filter(
      (user) => user.role === role && (!zone || user.zone === zone),
    );
    res.json(people.map(toPersonDto));
  });

  api.post(`/${path}`, requireRole("MANAGER"), (req, res) => {
    const person = readPerson(req.body);
    const password = requiredText(req.body, "password", "la contraseña");
    if (password.length < 8)
      throw unprocessable("La contraseña debe tener al menos 8 caracteres.");
    const user = {
      id: store.nextId("user"),
      role,
      ...person,
      password,
      active: true,
    };
    store.users.push(user);
    res.status(201).json(toPersonDto(user));
  });

  api.put(`/${path}/:id`, requireRole("MANAGER"), (req, res) => {
    const user = findPerson(req.params.id);
    Object.assign(user, readPerson(req.body, user));
    res.json(toPersonDto(user));
  });

  api.delete(`/${path}/:id`, requireRole("MANAGER"), (req, res) => {
    const user = findPerson(req.params.id);
    user.active = false;
    for (const route of store.routes) {
      route.guides = route.guides.filter((guide) => guide.guideId !== user.id);
      if (
        route.guides.length > 0 &&
        !route.guides.some((guide) => guide.primary)
      ) {
        route.guides[0].primary = true;
      }
    }
    res.status(204).end();
  });
}

function toRouteDto(store, route) {
  const proposer = store.user(route.proposedById);
  return {
    code: route.code,
    schoolId: route.schoolId,
    schoolName: store.school(route.schoolId)?.name ?? null,
    zone: zoneOf(route.code),
    description: route.description,
    status: route.status,
    reviewNotes: route.reviewNotes,
    proposedBy: { id: proposer.id, name: proposer.name },
    active: route.active,
    guides: route.guides.map(({ guideId, primary }) => ({
      guideId,
      name: store.user(guideId).name,
      primary,
    })),
    studentCount: store.activeStudents(route.code).length,
  };
}

function findRoute(store, user, code) {
  const route = store.route(code);
  if (!route || !canAccessRoute(user, route))
    throw notFound(`La ruta ${code} no existe.`);
  return route;
}

const guidesLabel = (count) => (count === 1 ? "1 guía" : `${count} guías`);
const studentsLabel = (count) =>
  count === 1 ? "1 estudiante" : `${count} estudiantes`;

function registerRoutes(api, store) {
  const readRouteFields = (body, code) => {
    const school = store.school(Number(body?.schoolId));
    if (!school?.active) throw unprocessable("Selecciona un colegio activo.");
    if (school.zone !== zoneOf(code)) {
      throw unprocessable(
        "El colegio debe estar en la misma localidad de la ruta.",
      );
    }
    return {
      schoolId: school.id,
      description: requiredText(body, "description", "la descripción"),
    };
  };

  const findReviewable = (req) => {
    const route = findRoute(store, req.user, req.params.code);
    if (route.status !== "IN_REVIEW")
      throw unprocessable("La ruta no está en revisión.");
    return route;
  };

  api.get("/routes", (req, res) => {
    const zone = scopedZone(req.user, req.query.zone);
    const guideId = req.query.guideId ? Number(req.query.guideId) : null;
    const routes = store.routes.filter(
      (route) =>
        canAccessRoute(req.user, route) &&
        (!zone || zoneOf(route.code) === zone) &&
        (!req.query.status || route.status === req.query.status) &&
        (!guideId || route.guides.some((guide) => guide.guideId === guideId)),
    );
    res.json(routes.map((route) => toRouteDto(store, route)));
  });

  api.get("/routes/:code", (req, res) => {
    res.json(toRouteDto(store, findRoute(store, req.user, req.params.code)));
  });

  api.post("/routes", (req, res) => {
    const code = requiredText(
      req.body,
      "code",
      "el código de la ruta",
    ).toUpperCase();
    if (!ROUTE_CODE.test(code)) {
      throw unprocessable(
        "El código debe tener las dos letras de la localidad y dos dígitos, por ejemplo MM04.",
      );
    }
    const zone = zoneOf(code);
    if (!zoneCodes(store).includes(zone))
      throw unprocessable(`No existe la localidad ${zone}.`);
    if (req.user.role !== "MANAGER" && zone !== req.user.zone) {
      throw unprocessable(
        `Solo puedes crear rutas de tu zona (${req.user.zone}).`,
      );
    }
    if (store.route(code))
      throw unprocessable(`Ya existe una ruta con el código ${code}.`);
    const route = {
      code,
      ...readRouteFields(req.body, code),
      status: "DRAFT",
      reviewNotes: null,
      proposedById: req.user.id,
      active: true,
      guides: [],
    };
    store.routes.push(route);
    res.status(201).json(toRouteDto(store, route));
  });

  // Changes made by guides or leaders go back through review; the manager is
  // the reviewer, so their metadata edits keep the current status.
  api.put("/routes/:code", (req, res) => {
    const route = findRoute(store, req.user, req.params.code);
    if (route.status === "IN_REVIEW" && req.user.role !== "MANAGER") {
      throw unprocessable(
        "La ruta está en revisión. Espera la respuesta antes de editarla.",
      );
    }
    Object.assign(route, readRouteFields(req.body, route.code));
    if (req.user.role !== "MANAGER") route.status = "DRAFT";
    res.json(toRouteDto(store, route));
  });

  api.delete("/routes/:code", requireRole("MANAGER"), (req, res) => {
    findRoute(store, req.user, req.params.code).active = false;
    res.status(204).end();
  });

  api.post("/routes/:code/submit", (req, res) => {
    const route = findRoute(store, req.user, req.params.code);
    if (!["DRAFT", "REJECTED"].includes(route.status)) {
      throw unprocessable(
        "Solo puedes enviar a revisión rutas en borrador o rechazadas.",
      );
    }
    const geoTrips = TRIP_CODES.map((tripCode) =>
      store.geoTrip(route.code, tripCode),
    );
    const missing = TRIP_CODES.filter((_, index) => !geoTrips[index]);
    if (missing.length > 0) {
      const trips =
        missing.length === 1
          ? `del recorrido ${missing[0]}`
          : "de los recorridos 541 y 542";
      throw unprocessable(
        `Carga el KMZ ${trips} antes de enviar la ruta a revisión.`,
      );
    }
    const lengths = geoTrips.map((geoTrip) => geoTrip.lengthM);
    if (
      lengths.some((length) => length > MAX_TRIP_LENGTH_M) ||
      lengths[0] + lengths[1] > MAX_ROUTE_LENGTH_M
    ) {
      throw unprocessable("Los recorridos superan los límites de distancia.");
    }
    Object.assign(route, { status: "IN_REVIEW", reviewNotes: null });
    res.json(toRouteDto(store, route));
  });

  api.post("/routes/:code/approve", requireRole("MANAGER"), (req, res) => {
    const route = findReviewable(req);
    Object.assign(route, { status: "APPROVED", reviewNotes: null });
    res.json(toRouteDto(store, route));
  });

  api.post("/routes/:code/reject", requireRole("MANAGER"), (req, res) => {
    const route = findReviewable(req);
    const notes = requiredText(
      req.body,
      "notes",
      "las observaciones del rechazo",
    );
    Object.assign(route, { status: "REJECTED", reviewNotes: notes });
    res.json(toRouteDto(store, route));
  });

  api.put(
    "/routes/:code/guides",
    requireRole("LEADER", "MANAGER"),
    (req, res) => {
      const route = findRoute(store, req.user, req.params.code);
      if (!Array.isArray(req.body?.guides))
        throw unprocessable("Envía la lista de guías.");
      const guides = req.body.guides.map(({ guideId, primary }) => {
        const guide = store.user(Number(guideId));
        if (guide?.role !== "GUIDE" || !guide.active) {
          throw unprocessable("Uno de los guías no existe o está inactivo.");
        }
        if (guide.zone !== zoneOf(route.code)) {
          throw unprocessable(
            `${guide.name} no pertenece a la zona ${zoneOf(route.code)}.`,
          );
        }
        return { guideId: guide.id, primary: primary === true };
      });
      if (
        new Set(guides.map((guide) => guide.guideId)).size !== guides.length
      ) {
        throw unprocessable("Un guía aparece más de una vez.");
      }
      const studentCount = store.activeStudents(route.code).length;
      const required = requiredGuides(studentCount);
      if (guides.length < required) {
        throw unprocessable(
          `La ruta tiene ${studentsLabel(studentCount)} y necesita ${guidesLabel(required)}.`,
        );
      }
      if (guides.filter((guide) => guide.primary).length !== 1) {
        throw unprocessable("Marca exactamente un guía principal.");
      }
      route.guides = guides;
      res.json(toRouteDto(store, route));
    },
  );

  api.get("/routes/:code/attendance", (req, res) => {
    const route = findRoute(store, req.user, req.params.code);
    const { from, to } = req.query;
    if (!isDateString(from) || !isDateString(to) || from > to) {
      throw unprocessable("Indica un rango de fechas válido.");
    }
    const trips = new Map(
      store.trips
        .filter(
          (trip) =>
            trip.routeCode === route.code &&
            trip.date >= from &&
            trip.date <= to,
        )
        .map((trip) => [trip.id, trip]),
    );
    const records = store.attendance
      .filter((entry) => trips.has(entry.tripId))
      .map((entry) => {
        const trip = trips.get(entry.tripId);
        return {
          date: trip.date,
          tripCode: trip.tripCode,
          studentId: entry.studentId,
          studentName: store.student(entry.studentId).name,
          present: entry.present,
        };
      })
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          a.tripCode.localeCompare(b.tripCode) ||
          a.studentName.localeCompare(b.studentName),
      );
    res.json(records);
  });
}

function registerStudents(api, store) {
  const ensureCanManage = (user, routeCode) => {
    const route = findRoute(store, user, routeCode);
    if (user.role === "GUIDE" && !store.isAssignedGuide(user.id, route.code))
      throw forbidden();
    return route;
  };

  const findStudent = (id) => {
    const student = store.student(Number(id));
    if (!student) throw notFound("El estudiante no existe.");
    return student;
  };

  const ensureCapacity = (routeCode, studentId) => {
    const others = store
      .activeStudents(routeCode)
      .filter((student) => student.id !== studentId);
    if (others.length >= MAX_STUDENTS) {
      throw unprocessable(
        `La ruta ${routeCode} ya tiene ${MAX_STUDENTS} estudiantes, el máximo permitido.`,
      );
    }
  };

  const readMeetingPoints = (routeCode, value) =>
    Object.fromEntries(
      TRIP_CODES.map((tripCode) => {
        const code = value?.[tripCode];
        if (!code) {
          throw unprocessable(
            `Selecciona el punto de encuentro del recorrido ${tripCode}.`,
          );
        }
        const geoTrip = store.geoTrip(routeCode, tripCode);
        if (
          geoTrip &&
          !geoTrip.meetingPoints.some((point) => point.code === code)
        ) {
          throw unprocessable(
            `El recorrido ${tripCode} no tiene el punto ${code}.`,
          );
        }
        return [tripCode, code];
      }),
    );

  const readGuardians = (value, current = []) => {
    if (!Array.isArray(value) || value.length < 1 || value.length > 3) {
      throw unprocessable("Registra entre 1 y 3 acudientes.");
    }
    const guardians = value.map((guardian) => ({
      id: current.some((existing) => existing.id === guardian?.id)
        ? guardian.id
        : store.nextId("guardian"),
      name: requiredText(guardian, "name", "el nombre del acudiente"),
      documentType: requiredOneOf(
        guardian,
        "documentType",
        DOCUMENT_TYPES,
        "el tipo de documento del acudiente",
      ),
      documentNumber: requiredDocumentNumber(guardian, "documentNumber"),
      phone: requiredPhone(guardian, "phone"),
      relationship: requiredOneOf(
        guardian,
        "relationship",
        RELATIONSHIPS,
        "el parentesco del acudiente",
      ),
      primary: guardian.primary === true,
    }));
    if (guardians.filter((guardian) => guardian.primary).length !== 1) {
      throw unprocessable("Marca exactamente un acudiente principal.");
    }
    return guardians;
  };

  const readStudent = (body, current) => {
    const routeCode = requiredText(body, "routeCode", "la ruta");
    const student = {
      documentType: requiredOneOf(
        body,
        "documentType",
        DOCUMENT_TYPES,
        "un tipo de documento válido",
      ),
      documentNumber: requiredDocumentNumber(body, "documentNumber"),
      name: requiredText(body, "name", "el nombre del estudiante"),
      address: requiredText(body, "address", "la dirección"),
      grade: requiredText(body, "grade", "el grado"),
      schoolShift: requiredOneOf(
        body,
        "schoolShift",
        SCHOOL_SHIFTS,
        "una jornada válida",
      ),
      routeCode,
      meetingPoints: readMeetingPoints(routeCode, body.meetingPoints),
      guardians: readGuardians(body.guardians, current?.guardians),
    };
    const duplicate = store.students.some(
      (other) =>
        other.active &&
        other !== current &&
        other.documentNumber === student.documentNumber,
    );
    if (duplicate)
      throw unprocessable("Ya hay un estudiante activo con ese documento.");
    return student;
  };

  api.get("/routes/:code/students", (req, res) => {
    const route = findRoute(store, req.user, req.params.code);
    res.json(
      store.students.filter((student) => student.routeCode === route.code),
    );
  });

  api.post("/students", (req, res) => {
    const routeCode = requiredText(req.body, "routeCode", "la ruta");
    ensureCanManage(req.user, routeCode);
    ensureCapacity(routeCode);
    const student = {
      id: store.nextId("student"),
      ...readStudent(req.body),
      active: true,
    };
    store.students.push(student);
    res.status(201).json(student);
  });

  api.put("/students/:id", (req, res) => {
    const student = findStudent(req.params.id);
    ensureCanManage(req.user, student.routeCode);
    const fields = readStudent(req.body, student);
    if (fields.routeCode !== student.routeCode)
      ensureCanManage(req.user, fields.routeCode);
    if (student.active) ensureCapacity(fields.routeCode, student.id);
    Object.assign(student, fields);
    res.json(student);
  });

  api.delete("/students/:id", (req, res) => {
    const student = findStudent(req.params.id);
    ensureCanManage(req.user, student.routeCode);
    student.active = false;
    res.status(204).end();
  });
}

function registerTrips(api, store) {
  const isMember = (userId, trip) =>
    trip.executorIds.includes(userId) ||
    store.isAssignedGuide(userId, trip.routeCode);

  const toTripDto = (trip) => ({
    id: trip.id,
    routeCode: trip.routeCode,
    tripCode: trip.tripCode,
    date: trip.date,
    scheduledStart: trip.scheduledStart,
    citationTime: trip.citationTime,
    status: trip.status,
    startedAt: trip.startedAt,
    endedAt: trip.endedAt,
    requiredGuides: requiredGuides(store.activeStudents(trip.routeCode).length),
    guides: store.route(trip.routeCode).guides.map(({ guideId, primary }) => ({
      guideId,
      name: store.user(guideId).name,
      primary,
    })),
    executors: trip.executorIds.map((userId) => ({
      userId,
      name: store.user(userId).name,
    })),
  });

  const findTrip = (user, id) => {
    const trip = store.trip(Number(id));
    const visible =
      trip &&
      (user.role === "MANAGER" ||
        (user.role === "LEADER" && zoneOf(trip.routeCode) === user.zone) ||
        isMember(user.id, trip));
    if (!visible) throw notFound("El recorrido no existe.");
    return trip;
  };

  const findOperable = (user, id) => {
    const trip = findTrip(user, id);
    if (!canOperateTrip(store, user, trip))
      throw forbidden("No estás asignado a este recorrido.");
    return trip;
  };

  const addExecutor = (trip, userId) => {
    if (!trip.executorIds.includes(userId)) trip.executorIds.push(userId);
  };

  api.get("/trips", (req, res) => {
    const date = isDateString(req.query.date) ? req.query.date : bogotaDate();
    const zone = scopedZone(req.user, req.query.zone);
    const requestedUser = req.query.userId ? Number(req.query.userId) : null;
    const userId = req.user.role === "GUIDE" ? req.user.id : requestedUser;
    const trips = store
      .tripsOn(date)
      .filter(
        (trip) =>
          (!zone || zoneOf(trip.routeCode) === zone) &&
          (!userId || isMember(userId, trip)),
      )
      .sort(
        (a, b) =>
          a.scheduledStart.localeCompare(b.scheduledStart) ||
          a.routeCode.localeCompare(b.routeCode),
      );
    res.json(trips.map(toTripDto));
  });

  api.post("/trips/:id/start", (req, res) => {
    const trip = findOperable(req.user, req.params.id);
    if (trip.status !== "SCHEDULED")
      throw unprocessable("Este recorrido ya fue iniciado.");
    if (trip.date !== bogotaDate())
      throw unprocessable("Solo puedes iniciar recorridos de hoy.");
    Object.assign(trip, {
      status: "IN_PROGRESS",
      startedAt: new Date().toISOString(),
    });
    addExecutor(trip, req.user.id);
    res.json(toTripDto(trip));
  });

  api.post("/trips/:id/finish", (req, res) => {
    const trip = findOperable(req.user, req.params.id);
    if (trip.status !== "IN_PROGRESS")
      throw unprocessable("Este recorrido no está en curso.");
    const endedAt = new Date();
    Object.assign(trip, { status: "FINISHED", endedAt: endedAt.toISOString() });
    const presentCount = store.attendance.filter(
      (entry) => entry.tripId === trip.id && entry.present,
    ).length;
    res.json({
      tripId: trip.id,
      startedAt: trip.startedAt,
      endedAt: trip.endedAt,
      durationMinutes: Math.round(
        (endedAt - new Date(trip.startedAt)) / 60_000,
      ),
      presentCount,
      enrolledCount: store.activeStudents(trip.routeCode).length,
    });
  });

  api.post(
    "/trips/:id/executors",
    requireRole("GUIDE", "LEADER"),
    (req, res) => {
      const trip = findTrip(req.user, req.params.id);
      if (
        req.user.role === "GUIDE" &&
        !store.isAssignedGuide(req.user.id, trip.routeCode)
      ) {
        throw forbidden("No estás asignado a esta ruta.");
      }
      if (trip.status === "FINISHED")
        throw unprocessable("Este recorrido ya finalizó.");
      addExecutor(trip, req.user.id);
      res.json(toTripDto(trip));
    },
  );

  api.post("/trips/:id/attendance", (req, res) => {
    const trip = findOperable(req.user, req.params.id);
    if (trip.status !== "IN_PROGRESS")
      throw unprocessable("Este recorrido no está en curso.");
    const meetingPointCode = requiredText(
      req.body,
      "meetingPointCode",
      "el punto de encuentro",
    );
    if (!Array.isArray(req.body.records))
      throw unprocessable("Envía la lista de asistencia.");
    const enrolled = new Set(
      store.activeStudents(trip.routeCode).map((student) => student.id),
    );
    const records = req.body.records.map(({ studentId, present }) => {
      if (!enrolled.has(studentId) || typeof present !== "boolean") {
        throw unprocessable(
          "La asistencia incluye estudiantes que no están en la ruta.",
        );
      }
      return { studentId, present };
    });
    store.recordAttendance(
      trip,
      meetingPointCode,
      records,
      new Date().toISOString(),
    );
    res.status(204).end();
  });
}

function registerArrivals(api, store) {
  const toArrivalDto = (arrival) => ({
    id: arrival.id,
    guideId: arrival.guideId,
    guideName: store.user(arrival.guideId).name,
    routeCode: arrival.routeCode,
    tripId: arrival.tripId,
    date: arrival.date,
    type: arrival.type,
    minutesLate: arrival.minutesLate,
    status: arrival.status,
    accumulatedCount: arrival.accumulatedCount,
    action: arrival.action,
  });

  api.get("/arrivals", (req, res) => {
    const zone = scopedZone(req.user, req.query.zone);
    const requestedGuide = req.query.guideId ? Number(req.query.guideId) : null;
    const guideId = req.user.role === "GUIDE" ? req.user.id : requestedGuide;
    const since = req.query.since ? new Date(req.query.since) : null;
    if (since && Number.isNaN(since.getTime()))
      throw unprocessable("La fecha since no es válida.");
    const arrivals = store.arrivals
      .filter(
        (arrival) =>
          (!zone || zoneOf(arrival.routeCode) === zone) &&
          (!guideId || arrival.guideId === guideId) &&
          (!since || new Date(arrival.createdAt) > since),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(arrivals.map(toArrivalDto));
  });

  api.patch("/arrivals/:id", requireRole("LEADER", "MANAGER"), (req, res) => {
    const arrival = store.arrivals.find(
      (candidate) => candidate.id === Number(req.params.id),
    );
    const zone = scopedZone(req.user);
    if (!arrival || (zone && zoneOf(arrival.routeCode) !== zone)) {
      throw notFound("El registro no existe.");
    }
    arrival.status = requiredOneOf(
      req.body,
      "status",
      ARRIVAL_STATUSES[arrival.type],
      "un estado válido para este tipo de llegada",
    );
    res.json(toArrivalDto(arrival));
  });
}
