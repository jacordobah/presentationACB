import { TRIP_LAYOUTS } from "./data/trips.js";
import { pointAlong } from "./geometry.js";
import {
  arrivalAction,
  buildGeoTrip,
  CITATION_LEAD_MINUTES,
  CODE_LABELS,
  TRIP_CODES,
} from "./rules.js";
import {
  addDays,
  addMinutes,
  atBogotaTime,
  bogotaDate,
  isWeekend,
  MINUTE_MS,
} from "./time.js";

const DEMO_PASSWORD = "acb2026";
const HISTORY_DAYS = 14;
const HISTORY_START_TIMES = { 541: "06:00", 542: "12:15" };
const RIDING_METERS_PER_MINUTE = 200;

const ZONES = [
  { code: "MM", name: "Los Mártires" },
  { code: "KE", name: "Kennedy" },
];

const PEOPLE = [
  {
    username: "gerente1",
    role: "MANAGER",
    name: "Claudia Liliana Restrepo Duarte",
    zone: null,
    documentType: "CC",
    documentNumber: "52318470",
    address: "Carrera 7 # 63-44",
    email: "claudia.restrepo@acb.example",
    phone: "3104567812",
    contractNumber: "CPS-2026-0112",
  },
  {
    username: "lider1",
    role: "LEADER",
    name: "Marcela Patricia Vargas Ortiz",
    zone: "MM",
    documentType: "CC",
    documentNumber: "1022345871",
    address: "Calle 19 # 24-31",
    email: "marcela.vargas@acb.example",
    phone: "3157784120",
    contractNumber: "CPS-2026-0245",
  },
  {
    username: "lider2",
    role: "LEADER",
    name: "Óscar Iván Beltrán Torres",
    zone: "KE",
    documentType: "CC",
    documentNumber: "80123654",
    address: "Calle 38 Sur # 79-15",
    email: "oscar.beltran@acb.example",
    phone: "3208851436",
    contractNumber: "CPS-2026-0246",
  },
  {
    username: "guia1",
    role: "GUIDE",
    name: "Camilo Andrés Pardo Ruiz",
    zone: "MM",
    documentType: "CC",
    documentNumber: "1019087452",
    address: "Carrera 24 # 12-40",
    email: "camilo.pardo@acb.example",
    phone: "3016652398",
    contractNumber: "CPS-2026-0391",
  },
  {
    username: "guia2",
    role: "GUIDE",
    name: "Daniela Fernanda Cortés Gil",
    zone: "MM",
    documentType: "CC",
    documentNumber: "1032456120",
    address: "Calle 13 # 27-18",
    email: "daniela.cortes@acb.example",
    phone: "3112045786",
    contractNumber: "CPS-2026-0392",
  },
  {
    username: "guia3",
    role: "GUIDE",
    name: "Jhon Fredy Castañeda López",
    zone: "MM",
    documentType: "CC",
    documentNumber: "79654321",
    address: "Calle 6 # 26-09",
    email: "jhon.castaneda@acb.example",
    phone: "3185529047",
    contractNumber: "CPS-2026-0393",
  },
  {
    username: "guia4",
    role: "GUIDE",
    name: "Paula Andrea Moreno Salazar",
    zone: "KE",
    documentType: "CC",
    documentNumber: "1030612984",
    address: "Carrera 78 # 40-22 Sur",
    email: "paula.moreno@acb.example",
    phone: "3502218874",
    contractNumber: "CPS-2026-0410",
  },
  {
    username: "guia5",
    role: "GUIDE",
    name: "Sebastián Herrera Quintero",
    zone: "KE",
    documentType: "PPT",
    documentNumber: "5843217",
    address: "Calle 41 Sur # 80-36",
    email: "sebastian.herrera@acb.example",
    phone: "3143390561",
    contractNumber: "CPS-2026-0411",
  },
];

const SCHOOLS = [
  {
    key: "nieto",
    name: "Colegio Liceo Nacional Agustín Nieto Caballero IED",
    schoolCode: "111001012386",
    phone: "6013517420",
    address: "Calle 12 # 22-37",
    zone: "MM",
    latitude: 4.606373,
    longitude: -74.085945,
  },
  {
    key: "santos",
    name: "Colegio Eduardo Santos IED",
    schoolCode: "111001013561",
    phone: "6013716205",
    address: "Calle 1H # 26-55",
    zone: "MM",
    latitude: 4.596796,
    longitude: -74.095782,
  },
  {
    key: "kennedy",
    name: "Colegio John F. Kennedy IED",
    schoolCode: "111001045217",
    phone: "6014509932",
    address: "Carrera 77 # 37-21 Sur",
    zone: "KE",
    latitude: 4.61954,
    longitude: -74.150963,
  },
];

const ROUTES = [
  {
    code: "MM01",
    school: "nieto",
    description:
      "Desde Los Ejidos por Pensilvania y Ricaurte hasta el colegio.",
    status: "APPROVED",
    proposedBy: "guia1",
    guides: [
      ["guia1", true],
      ["guia2", false],
    ],
  },
  {
    code: "MM02",
    school: "santos",
    description: "Recorre los barrios Eduardo Santos y El Progreso.",
    status: "APPROVED",
    proposedBy: "guia3",
    guides: [["guia3", true]],
  },
  {
    code: "KE01",
    school: "kennedy",
    description:
      "Desde el parque Cayetano Cañizares por Ciudad Kennedy hasta el colegio.",
    status: "APPROVED",
    proposedBy: "guia4",
    guides: [
      ["guia4", true],
      ["guia5", false],
    ],
  },
  {
    code: "MM03",
    school: "nieto",
    description:
      "Nueva ruta desde el parque Cundinamarca por la Plaza de la Hoja y Paloquemao.",
    status: "IN_REVIEW",
    proposedBy: "guia1",
    guides: [],
  },
];

// [name, NUIP, grade, meeting point for 541, meeting point for 542]
const STUDENTS = {
  MM01: [
    ["Valentina Ruiz Peña", "1012458730", "7", "PE01", "PE04"],
    ["Juan José Martínez Ríos", "1011987654", "9", "PE01", "PE04"],
    ["Sara Sofía Gómez Arias", "1013365120", "6", "PE02", "PE04"],
    ["Santiago Cárdenas Mora", "1010845291", "10", "PE02", "PE04"],
    ["Mariana López Vega", "1012773406", "8", "PE03", "PE03"],
    ["Samuel Díaz Romero", "1013102587", "6", "PE03", "PE03"],
    ["Isabella Castro Niño", "1011640938", "11", "PE04", "PE02"],
    ["Emmanuel Torres Cruz", "1012219845", "7", "PE04", "PE02"],
  ],
  MM02: [
    ["Luciana Herrera Bonilla", "1014025567", "6", "PE01", "PE03"],
    ["Matías Rincón Parra", "1013589012", "8", "PE02", "PE04"],
    ["Gabriela Suárez Ospina", "1012907745", "7", "PE02", "PE03"],
    ["Thiago Méndez Rueda", "1014231876", "6", "PE03", "PE02"],
  ],
  KE01: [
    ["Antonella Quintero Lara", "1030612458", "6", "PE01", "PE04"],
    ["Jerónimo Pineda Ávila", "1030587214", "7", "PE01", "PE04"],
    ["Salomé Acosta Rivas", "1031245876", "8", "PE01", "PE04"],
    ["Martín Velásquez Sierra", "1030998123", "9", "PE01", "PE04"],
    ["Danna Valentina Ortiz Camacho", "1031420657", "6", "PE02", "PE03"],
    ["Juan Esteban Molina Prieto", "1030776345", "10", "PE02", "PE03"],
    ["María José Galindo Caicedo", "1031109832", "7", "PE02", "PE03"],
    ["Nicolás Barrera Montoya", "1030854409", "11", "PE02", "PE03"],
    ["Zharick Muñoz Lozano", "1031367721", "6", "PE03", "PE02"],
    ["Dylan Andrés Zapata Rojas", "1030691587", "8", "PE03", "PE02"],
    ["Allison Gutiérrez Pinzón", "1031058246", "9", "PE03", "PE02"],
    ["Kevin Santiago Patiño Jiménez", "1030923678", "7", "PE03", "PE02"],
  ],
};

const FEMALE_NAMES = [
  "Diana",
  "Luz Marina",
  "Yolanda",
  "Sandra Milena",
  "Paola",
  "Gloria",
];
const MALE_NAMES = [
  "Jorge",
  "Wilson",
  "Édgar",
  "Fredy",
  "Luis Carlos",
  "Hernán",
  "Nelson",
];
const SURNAMES = [
  "Rodríguez",
  "Gómez",
  "González",
  "Hernández",
  "Ramírez",
  "Sánchez",
  "Rojas",
];
const MOBILE_PREFIXES = [
  "300",
  "301",
  "310",
  "311",
  "313",
  "315",
  "316",
  "318",
  "320",
  "321",
];

const ADDRESS_GRID = {
  MM: { calles: [3, 24], carreras: [16, 30], suffix: "" },
  KE: { calles: [35, 42], carreras: [72, 86], suffix: " Sur" },
};

const LATE_ARRIVALS_THIS_MONTH = [3, 6, 2, 9];

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (random, min, max) =>
  min + Math.floor(random() * (max - min + 1));
const pick = (random, items) => items[Math.floor(random() * items.length)];
const digits = (random, length) =>
  Array.from({ length }, () => between(random, 0, 9)).join("");

export function seed(store, startedAt) {
  const random = createRandom(2026);
  const today = bogotaDate(startedAt);

  store.zones.push(...ZONES);
  for (const person of PEOPLE) {
    store.users.push({
      id: store.nextId("user"),
      password: DEMO_PASSWORD,
      active: true,
      ...person,
    });
  }
  seedSchoolsAndRoutes(store);
  seedStudents(store, random);

  const history = operatingDays(today);
  for (const date of history) seedFinishedDay(store, random, date);
  seedArrivals(store, history, today);
  seedDayReports(store, random, history.at(-1));
  seedToday(store, startedAt, today);
}

function seedSchoolsAndRoutes(store) {
  const schoolIds = {};
  for (const { key, ...school } of SCHOOLS) {
    schoolIds[key] = store.nextId("school");
    store.schools.push({ id: schoolIds[key], active: true, ...school });
  }

  for (const route of ROUTES) {
    store.routes.push({
      code: route.code,
      schoolId: schoolIds[route.school],
      description: route.description,
      status: route.status,
      reviewNotes: null,
      proposedById: store.userByUsername(route.proposedBy).id,
      active: true,
      guides: route.guides.map(([username, primary]) => ({
        guideId: store.userByUsername(username).id,
        primary,
      })),
    });
  }

  for (const layout of TRIP_LAYOUTS) {
    const route = store.route(layout.routeCode);
    store.saveImport(
      buildGeoTrip({
        routeCode: layout.routeCode,
        tripCode: layout.tripCode,
        coordinates: layout.coordinates,
        points: layout.meetingPoints,
        schoolName: store.school(route.schoolId).name,
      }),
    );
  }
}

function seedStudents(store, random) {
  let index = 0;
  for (const [routeCode, students] of Object.entries(STUDENTS)) {
    for (const [
      name,
      documentNumber,
      grade,
      morningPoint,
      afternoonPoint,
    ] of students) {
      store.students.push({
        id: store.nextId("student"),
        documentType: "NUIP",
        documentNumber,
        name,
        address: randomAddress(random, routeCode.slice(0, 2)),
        grade,
        schoolShift: "MORNING",
        routeCode,
        meetingPoints: { 541: morningPoint, 542: afternoonPoint },
        guardians: guardiansFor(store, random, name, index),
        active: true,
      });
      index++;
    }
  }
}

function randomAddress(random, zone) {
  const { calles, carreras, suffix } = ADDRESS_GRID[zone];
  const calle = between(random, ...calles);
  const carrera = between(random, ...carreras);
  const plate = between(random, 5, 95);
  return random() < 0.5
    ? `Calle ${calle}${suffix} # ${carrera}-${plate}`
    : `Carrera ${carrera} # ${calle}-${plate}${suffix}`;
}

function guardiansFor(store, random, studentName, index) {
  const [firstSurname, secondSurname] = studentName.split(" ").slice(-2);
  const mother = () =>
    `${pick(random, FEMALE_NAMES)} ${secondSurname} ${pick(random, SURNAMES)}`;
  const father = () =>
    `${pick(random, MALE_NAMES)} ${firstSurname} ${pick(random, SURNAMES)}`;
  const relative = () =>
    `${pick(random, FEMALE_NAMES)} ${firstSurname} ${pick(random, SURNAMES)}`;
  const neighbor = () =>
    `${pick(random, MALE_NAMES)} ${pick(random, SURNAMES)} ${pick(random, SURNAMES)}`;
  const households = [
    [
      ["MOTHER", mother],
      ["FATHER", father],
    ],
    [["MOTHER", mother]],
    [
      ["FATHER", father],
      ["MOTHER", mother],
      ["RELATIVE", relative],
    ],
    [
      ["UNCLE_AUNT", relative],
      ["NEIGHBOR", neighbor],
    ],
  ];
  return households[index % households.length].map(
    ([relationship, nameFor], position) => ({
      id: store.nextId("guardian"),
      name: nameFor(),
      documentType: index % 5 === 3 && position === 0 ? "PPT" : "CC",
      documentNumber: `${between(random, 1, 9)}${digits(random, between(random, 7, 9))}`,
      phone: `${pick(random, MOBILE_PREFIXES)}${digits(random, 7)}`,
      relationship,
      primary: position === 0,
    }),
  );
}

// The last two weeks of school days. Yesterday always counts, even after a
// weekend, so the demo has codes from the previous day.
function operatingDays(today) {
  const days = [];
  for (let offset = HISTORY_DAYS; offset >= 1; offset--) {
    const date = addDays(today, -offset);
    if (offset === 1 || !isWeekend(date)) days.push(date);
  }
  return days;
}

function approvedRoutes(store) {
  return store.routes.filter((route) => route.status === "APPROVED");
}

function createTrip(store, { routeCode, tripCode, date, start, ...state }) {
  const trip = {
    id: store.nextId("trip"),
    routeCode,
    tripCode,
    date,
    scheduledStart: start.toISOString(),
    citationTime: addMinutes(start, -CITATION_LEAD_MINUTES).toISOString(),
    status: "SCHEDULED",
    startedAt: null,
    endedAt: null,
    executorIds: [],
    ...state,
  };
  store.trips.push(trip);
  return trip;
}

function seedFinishedDay(store, random, date) {
  for (const route of approvedRoutes(store)) {
    const executorIds = route.guides.map((guide) => guide.guideId);
    const presentInMorning = new Set();
    for (const tripCode of TRIP_CODES) {
      const geoTrip = store.geoTrip(route.code, tripCode);
      const start = atBogotaTime(date, HISTORY_START_TIMES[tripCode]);
      const startedAt = addMinutes(start, between(random, 0, 2));
      const ridingMinutes =
        geoTrip.lengthM / RIDING_METERS_PER_MINUTE +
        2 * geoTrip.meetingPoints.length;
      const endedAt = addMinutes(
        startedAt,
        Math.round(ridingMinutes) + between(random, 0, 4),
      );
      const trip = createTrip(store, {
        routeCode: route.code,
        tripCode,
        date,
        start,
        status: "FINISHED",
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        executorIds,
      });

      // Students who missed the morning ride also miss the afternoon one.
      for (const student of store.activeStudents(route.code)) {
        const present =
          tripCode === "541"
            ? random() < 0.9
            : presentInMorning.has(student.id) && random() < 0.95;
        if (tripCode === "541" && present) presentInMorning.add(student.id);
        const meetingPointCode =
          tripCode === "541" ? student.meetingPoints[541] : "PE01";
        store.recordAttendance(
          trip,
          meetingPointCode,
          [{ studentId: student.id, present }],
          addMinutes(startedAt, 2).toISOString(),
        );
      }
    }
  }
}

function seedArrivals(store, history, today) {
  const guia2 = store.userByUsername("guia2");
  const monthDays = history.filter((date) =>
    date.startsWith(today.slice(0, 7)),
  );
  const slots = monthDays
    .slice(-LATE_ARRIVALS_THIS_MONTH.length)
    .map((date) => [date, "541"]);
  for (const date of [...monthDays].reverse()) {
    if (slots.length >= LATE_ARRIVALS_THIS_MONTH.length) break;
    slots.push([date, "542"]);
  }
  slots.sort(
    ([dateA, tripA], [dateB, tripB]) =>
      dateA.localeCompare(dateB) || tripA.localeCompare(tripB),
  );
  slots.forEach(([date, tripCode], index) => {
    const trip = store.tripFor("MM01", tripCode, date);
    const accumulatedCount = index + 1;
    addArrival(store, {
      guide: guia2,
      trip,
      type: "NON_IMPACT",
      minutesLate: LATE_ARRIVALS_THIS_MONTH[index],
      status: accumulatedCount < slots.length ? "NOTIFIED" : "PENDING",
      accumulatedCount,
    });
  });

  const impactDate = history.at(-2) ?? history.at(-1);
  addArrival(store, {
    guide: store.userByUsername("guia4"),
    trip: store.tripFor("KE01", "541", impactDate),
    type: "IMPACT",
    minutesLate: 22,
    status: "OPEN",
    accumulatedCount: 1,
  });
}

function addArrival(
  store,
  { guide, trip, type, minutesLate, status, accumulatedCount },
) {
  store.addArrival({
    guideId: guide.id,
    routeCode: trip.routeCode,
    tripId: trip.id,
    date: trip.date,
    type,
    minutesLate,
    status,
    accumulatedCount,
    action: arrivalAction(type, accumulatedCount),
    createdAt: addMinutes(trip.citationTime, minutesLate).toISOString(),
  });
}

function jitter(random, [lng, lat], meters = 6) {
  const degrees = meters / 111_320;
  return [lng + (random() - 0.5) * degrees, lat + (random() - 0.5) * degrees];
}

function addReport(
  store,
  { status, trip, userId, at, location, detail = null },
) {
  store.addReport({
    name: CODE_LABELS[status],
    route: trip.routeCode,
    tripCode: trip.tripCode,
    status,
    userId,
    notifiedAt: new Date(at).toISOString(),
    longitude: location[0],
    latitude: location[1],
    detail,
    photoId: null,
  });
}

function seedDayReports(store, random, date) {
  const lastTripByGuide = new Map();
  for (const trip of store.tripsOn(date)) {
    const route = store.route(trip.routeCode);
    const geoTrip = store.geoTrip(trip.routeCode, trip.tripCode);
    const firstPoint = geoTrip.meetingPoints[0].location;
    const primary = route.guides.find((guide) => guide.primary);

    route.guides.forEach((guide, index) => {
      const late = store.arrivals.find(
        (arrival) =>
          arrival.tripId === trip.id && arrival.guideId === guide.guideId,
      );
      const arrivedAt = addMinutes(
        trip.citationTime,
        late ? late.minutesLate : -(2 + index * 3 + between(random, 0, 2)),
      );
      addReport(store, {
        status: "523",
        trip,
        userId: guide.guideId,
        at: arrivedAt,
        location: jitter(random, firstPoint),
      });
      lastTripByGuide.set(guide.guideId, trip);
    });

    addReport(store, {
      status: trip.tripCode,
      trip,
      userId: primary.guideId,
      at: trip.startedAt,
      location: jitter(random, firstPoint),
    });
    addReport(store, {
      status: "520",
      trip,
      userId: primary.guideId,
      at: addMinutes(trip.startedAt, 10),
      location: pointAlong(geoTrip.coordinates, geoTrip.lengthM / 2),
    });
  }

  const mm01Morning = store.tripFor("MM01", "541", date);
  addReport(store, {
    status: "512",
    trip: mm01Morning,
    userId: store.userByUsername("guia1").id,
    at: addMinutes(mm01Morning.startedAt, 6),
    location: store.geoTrip("MM01", "541").meetingPoints[1].location,
    detail:
      "Una estudiante llegó al punto con la llanta trasera pinchada. Le prestamos la bicicleta de respaldo y seguimos sin retraso.",
  });
  const ke01Afternoon = store.tripFor("KE01", "542", date);
  const ke01Geo = store.geoTrip("KE01", "542");
  addReport(store, {
    status: "537",
    trip: ke01Afternoon,
    userId: store.userByUsername("guia5").id,
    at: addMinutes(ke01Afternoon.startedAt, 12),
    location: pointAlong(ke01Geo.coordinates, ke01Geo.lengthM * 0.4),
    detail:
      "Semáforo dañado en el cruce de la avenida. Pedimos apoyo a la Policía para pasar con el grupo.",
  });

  for (const [guideId, trip] of lastTripByGuide) {
    const destination = store.geoTrip(trip.routeCode, trip.tripCode).destination
      .location;
    addReport(store, {
      status: "524",
      trip,
      userId: guideId,
      at: addMinutes(trip.endedAt, 4),
      location: destination,
    });
    addReport(store, {
      status: "58",
      trip,
      userId: guideId,
      at: addMinutes(trip.endedAt, 9),
      location: destination,
    });
  }
}

function seedToday(store, startedAt, today) {
  const base = new Date(Math.ceil(startedAt.getTime() / MINUTE_MS) * MINUTE_MS);
  const inProgress = { MM02: -25, KE01: -15 };

  for (const route of approvedRoutes(store)) {
    const guideIds = route.guides.map((guide) => guide.guideId);
    const morningOffset = inProgress[route.code];
    if (morningOffset === undefined) {
      createTrip(store, {
        routeCode: route.code,
        tripCode: "541",
        date: today,
        start: addMinutes(base, 30),
      });
    } else {
      const start = addMinutes(base, morningOffset);
      const trip = createTrip(store, {
        routeCode: route.code,
        tripCode: "541",
        date: today,
        start,
        status: "IN_PROGRESS",
        startedAt: addMinutes(start, 1).toISOString(),
        executorIds: guideIds,
      });
      const firstPoint = store.geoTrip(route.code, "541").meetingPoints[0]
        .location;
      guideIds.forEach((guideId, index) => {
        addReport(store, {
          status: "523",
          trip,
          userId: guideId,
          at: addMinutes(trip.citationTime, -(2 + index * 3)),
          location: firstPoint,
        });
      });
      addReport(store, {
        status: "541",
        trip,
        userId: guideIds[0],
        at: trip.startedAt,
        location: firstPoint,
      });
    }
    createTrip(store, {
      routeCode: route.code,
      tripCode: "542",
      date: today,
      start: addMinutes(base, 4 * 60),
    });
  }
}
