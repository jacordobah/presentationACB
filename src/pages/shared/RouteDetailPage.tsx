import { ArrowLeft, Bike, Phone, Users } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { listTripGeometries } from "../../api/routeGeometry";
import { getRoute } from "../../api/routes";
import { listStudents } from "../../api/students";
import { assumeTrip, listTrips } from "../../api/trips";
import type { Route, Trip } from "../../api/types";
import { useSessionUser } from "../../auth/AuthContext";
import { AsyncContent } from "../../components/AsyncContent";
import { RouteStatusChip, TripStatusChip } from "../../components/Chips";
import { RoutePreview } from "../../components/RoutePreview";
import { EmptyState } from "../../components/States";
import { errorMessage, useToast } from "../../components/toast/ToastContext";
import { useResource } from "../../hooks/useResource";
import { LIST_POLL_MS } from "../../lib/config";
import { formatTime, todayInBogota } from "../../lib/dates";
import { TRIP_LABELS, plural } from "../../lib/labels";
import { requiredGuides } from "../../lib/rules";
import { TRIP_ROW_TONES } from "../../lib/tones";
import { AttendanceHistory } from "./AttendanceHistory";

const TABS = [
  { id: "map", label: "Mapa" },
  { id: "today", label: "Recorridos de hoy" },
  { id: "students", label: "Estudiantes" },
  { id: "attendance", label: "Asistencia" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function MapTab({ route }: { route: Route }) {
  const geometries = useResource(`geometry:${route.code}`, () =>
    listTripGeometries({ routeCode: route.code }, route.schoolName),
  );
  return (
    <AsyncContent
      resource={geometries}
      loadingLabel="Cargando el trazado…"
      isEmpty={(list) => list.length === 0}
      empty={<EmptyState title="Esta ruta todavía no tiene trazado" />}
    >
      {(list) => <RoutePreview routeCode={route.code} geometries={list} />}
    </AsyncContent>
  );
}

function TripRow({ trip, canAssume }: { trip: Trip; canAssume: boolean }) {
  const user = useSessionUser();
  const navigate = useNavigate();
  const toast = useToast();
  const [assuming, setAssuming] = useState(false);
  const isExecutor = trip.executors.some(
    (executor) => executor.userId === user.id,
  );
  const operationPath = `/leader/trips/${trip.id}`;

  const assume = async () => {
    setAssuming(true);
    try {
      await assumeTrip(trip.id);
      toast.show(
        `Asumiste el recorrido ${trip.tripCode} de ${trip.routeCode}.`,
        {
          tone: "success",
        },
      );
      navigate(operationPath);
    } catch (error) {
      toast.show(errorMessage(error), { tone: "error" });
      setAssuming(false);
    }
  };

  return (
    <li className={`list-row ${TRIP_ROW_TONES[trip.status]}`}>
      <div className="list-row__top">
        <span className="list-row__title">
          <strong>
            {trip.tripCode} {TRIP_LABELS[trip.tripCode]}
          </strong>
        </span>
        <TripStatusChip status={trip.status} />
      </div>
      <dl className="facts">
        <div>
          <dt>Citación</dt>
          <dd>{formatTime(trip.citationTime)}</dd>
        </div>
        <div>
          <dt>Inicio</dt>
          <dd>{formatTime(trip.scheduledStart)}</dd>
        </div>
        <div>
          <dt>Guías asignados</dt>
          <dd>
            {trip.guides.length > 0
              ? trip.guides.map((guide) => guide.name).join(", ")
              : "Sin guías"}
          </dd>
        </div>
        {trip.executors.length > 0 && (
          <div>
            <dt>Lo ejecutan</dt>
            <dd>
              {trip.executors.map((executor) => executor.name).join(", ")}
            </dd>
          </div>
        )}
      </dl>
      {canAssume &&
        trip.status !== "FINISHED" &&
        (isExecutor ? (
          <Link className="button button--primary" to={operationPath}>
            Abrir recorrido
          </Link>
        ) : (
          <button
            type="button"
            className="button"
            disabled={assuming}
            onClick={assume}
          >
            <Bike size={20} aria-hidden="true" />
            {assuming ? "Asumiendo…" : "Asumir recorrido"}
          </button>
        ))}
    </li>
  );
}

function TodayTab({ route, canAssume }: { route: Route; canAssume: boolean }) {
  const today = todayInBogota();
  const trips = useResource(
    `trips:${today}:${route.code}`,
    async () =>
      (await listTrips({ date: today })).filter(
        (trip) => trip.routeCode === route.code,
      ),
    { pollMs: LIST_POLL_MS },
  );
  return (
    <AsyncContent
      resource={trips}
      loadingLabel="Cargando recorridos…"
      isEmpty={(list) => list.length === 0}
      empty={
        <EmptyState icon={Bike} title="Esta ruta no tiene recorridos hoy" />
      }
    >
      {(list) => (
        <ul className="list">
          {list.map((trip) => (
            <TripRow key={trip.id} trip={trip} canAssume={canAssume} />
          ))}
        </ul>
      )}
    </AsyncContent>
  );
}

function StudentsTab({ route }: { route: Route }) {
  const students = useResource(`students:${route.code}`, async () =>
    (await listStudents(route.code))
      .filter((student) => student.active)
      .toSorted((a, b) => a.name.localeCompare(b.name)),
  );
  return (
    <AsyncContent
      resource={students}
      loadingLabel="Cargando estudiantes…"
      isEmpty={(list) => list.length === 0}
      empty={
        <EmptyState
          icon={Users}
          title="Esta ruta todavía no tiene estudiantes"
        />
      }
    >
      {(list) => (
        <ul className="list">
          {list.map((student) => {
            const guardian =
              student.guardians.find((candidate) => candidate.primary) ??
              student.guardians[0];
            return (
              <li key={student.id} className="list-row">
                <div className="list-row__top">
                  <strong>{student.name}</strong>
                  <span className="chip">Grado {student.grade}</span>
                </div>
                <dl className="facts">
                  <div>
                    <dt>Punto 541</dt>
                    <dd>{student.meetingPoints["541"]}</dd>
                  </div>
                  <div>
                    <dt>Punto 542</dt>
                    <dd>{student.meetingPoints["542"]}</dd>
                  </div>
                  {guardian && (
                    <div>
                      <dt>Acudiente principal</dt>
                      <dd>{guardian.name}</dd>
                    </div>
                  )}
                </dl>
                {guardian && (
                  <a className="button" href={`tel:${guardian.phone}`}>
                    <Phone size={20} aria-hidden="true" />
                    Llamar al acudiente
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AsyncContent>
  );
}

export default function RouteDetailPage() {
  const { code = "" } = useParams();
  const user = useSessionUser();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab: TabId = TABS.some((option) => option.id === requestedTab)
    ? (requestedTab as TabId)
    : "map";
  const basePath = user.role === "MANAGER" ? "/manager" : "/leader";
  const route = useResource(`route:${code}`, () => getRoute(code));

  return (
    <div className="page">
      <Link className="back-link" to={`${basePath}/routes`}>
        <ArrowLeft size={20} aria-hidden="true" />
        Rutas
      </Link>
      <AsyncContent resource={route} loadingLabel="Cargando la ruta…">
        {(loaded) => (
          <>
            <header className="page-header">
              <div className="page-header__title">
                <h1>Ruta {loaded.code}</h1>
                <p className="page-header__subtitle">{loaded.schoolName}</p>
              </div>
              <RouteStatusChip status={loaded.status} />
            </header>
            <dl className="facts">
              <div>
                <dt>Estudiantes</dt>
                <dd>{loaded.studentCount}</dd>
              </div>
              <div>
                <dt>Guías</dt>
                <dd>
                  {loaded.guides.length > 0
                    ? loaded.guides
                        .map(
                          (guide) =>
                            `${guide.name}${guide.primary ? " (principal)" : ""}`,
                        )
                        .join(", ")
                    : "Sin guías"}
                </dd>
              </div>
              <div>
                <dt>Guías requeridos</dt>
                <dd>
                  {plural(requiredGuides(loaded.studentCount), "guía", "guías")}
                </dd>
              </div>
            </dl>
            <p>{loaded.description}</p>
            <nav className="tabs" aria-label="Información de la ruta">
              {TABS.map((option) => (
                <Link
                  key={option.id}
                  to={`?tab=${option.id}`}
                  replace
                  aria-current={tab === option.id ? "page" : undefined}
                >
                  {option.label}
                </Link>
              ))}
            </nav>
            {tab === "map" && <MapTab route={loaded} />}
            {tab === "today" && (
              <TodayTab route={loaded} canAssume={user.role === "LEADER"} />
            )}
            {tab === "students" && <StudentsTab route={loaded} />}
            {tab === "attendance" && (
              <AttendanceHistory routeCode={loaded.code} />
            )}
          </>
        )}
      </AsyncContent>
    </div>
  );
}
