import { Bike, Play, Route as RouteIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { listCodeReports, reportCode } from "../../api/codes";
import { listTrips } from "../../api/trips";
import type { CodeReport, OperationalCode, Route, Trip } from "../../api/types";
import { useSessionUser } from "../../auth/AuthContext";
import { AsyncContent } from "../../components/AsyncContent";
import { TripStatusChip } from "../../components/Chips";
import { Notice } from "../../components/Notice";
import { EmptyState } from "../../components/States";
import { errorMessage, useToast } from "../../components/toast/ToastContext";
import { useAssignedRoutes } from "../../hooks/useAssignedRoutes";
import { useResource } from "../../hooks/useResource";
import { CODES } from "../../lib/codes";
import { LIST_POLL_MS } from "../../lib/config";
import { formatLongDate, formatTime, todayInBogota } from "../../lib/dates";
import { TRIP_LABELS, plural } from "../../lib/labels";
import { TRIP_ROW_TONES } from "../../lib/tones";
import { clearActiveTrip, useActiveTrip } from "../../location/activeTrip";
import { finishTracking } from "../../tracking/finishTracking";
import { useTracking } from "../../tracking/TrackingContext";
import "./TodayPage.css";

function actionLabel(trip: Trip) {
  if (trip.status === "IN_PROGRESS") return "Continuar recorrido";
  if (trip.status === "FINISHED") return "Ver resumen";
  return `Iniciar ${trip.tripCode}`;
}

function TripCard({
  trip,
  route,
  primary,
  guideRole,
}: {
  trip: Trip;
  route: Route | undefined;
  primary: boolean;
  guideRole: string | null;
}) {
  return (
    <li className={`trip-card ${TRIP_ROW_TONES[trip.status]}`}>
      <div className="trip-card__top">
        <div className="trip-card__identity">
          <span className="route-code">{trip.routeCode}</span>
          <span className="trip-card__shift">
            {trip.tripCode} {TRIP_LABELS[trip.tripCode]}
          </span>
        </div>
        <TripStatusChip status={trip.status} />
      </div>

      <p className="trip-card__school">
        {trip.schoolName ?? route?.schoolName ?? "Colegio"}
      </p>

      <dl className="facts">
        <div>
          <dt>Citación</dt>
          <dd>{formatTime(trip.citationTime)}</dd>
        </div>
        <div>
          <dt>Inicio</dt>
          <dd>{formatTime(trip.scheduledStart)}</dd>
        </div>
        {trip.startedAt && (
          <div>
            <dt>Salida</dt>
            <dd>{formatTime(trip.startedAt)}</dd>
          </div>
        )}
        {trip.endedAt && (
          <div>
            <dt>Fin</dt>
            <dd>{formatTime(trip.endedAt)}</dd>
          </div>
        )}
        {route && (
          <div>
            <dt>Estudiantes</dt>
            <dd>{route.studentCount}</dd>
          </div>
        )}
      </dl>

      {guideRole && <p className="trip-card__meta">{guideRole}</p>}

      <Link
        to={`/guide/trips/${trip.id}`}
        className={primary ? "button button--primary" : "button"}
      >
        {trip.status === "SCHEDULED" && <Play size={20} aria-hidden="true" />}
        {actionLabel(trip)}
      </Link>
    </li>
  );
}

function DayClosing({
  trips,
  codes,
  onReported,
}: {
  trips: Trip[];
  codes: CodeReport[];
  onReported: () => void;
}) {
  const user = useSessionUser();
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [locallyReported, setLocallyReported] = useState<Set<OperationalCode>>(
    () => new Set(),
  );
  const mine = codes.filter((report) => report.userId === user.id);
  const reported = (code: OperationalCode) =>
    locallyReported.has(code) || mine.some((report) => report.code === code);
  const next: OperationalCode | null = !reported("524")
    ? "524"
    : !reported("58")
      ? "58"
      : null;
  const lastTrip = trips
    .toSorted((a, b) => a.scheduledStart.localeCompare(b.scheduledStart))
    .at(-1);

  const report = async (code: OperationalCode) => {
    if (!lastTrip) return;
    setSending(true);
    try {
      await reportCode({
        code,
        label: CODES[code].label,
        routeCode: lastTrip.routeCode,
        userId: user.id,
      });
      setLocallyReported((current) => new Set(current).add(code));
      toast.show(
        code === "524"
          ? "Misión cumplida reportada."
          : "Disponibilidad reportada.",
        { tone: "success" },
      );
      onReported();
    } catch (error) {
      toast.show(errorMessage(error), { tone: "error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="section" aria-labelledby="closing-title">
      <h2 id="closing-title">Cierre del día</h2>
      {next === null ? (
        <Notice tone="success" title="Jornada cerrada">
          Reportaste misión cumplida y quedaste disponible para servicio.
        </Notice>
      ) : (
        <>
          <p>
            {next === "524"
              ? "Terminaste todos tus recorridos de hoy."
              : "Reportaste misión cumplida. Avisa cuando quedes disponible."}
          </p>
          <button
            type="button"
            className="button button--primary button--large button--block"
            disabled={sending}
            onClick={() => report(next)}
          >
            {next === "524"
              ? "Reportar misión cumplida (524)"
              : "Reportar disponible para servicio (58)"}
          </button>
        </>
      )}
    </section>
  );
}

export default function TodayPage() {
  const user = useSessionUser();
  const today = todayInBogota();
  const assigned = useAssignedRoutes();
  const activeTrip = useActiveTrip(user.id);
  const tracking = useTracking();

  const trips = useResource(
    `trips:${today}:${user.id}`,
    () => listTrips({ date: today, guideId: user.id }),
    { pollMs: LIST_POLL_MS },
  );
  const codes = useResource(
    `codes:${today}`,
    () => listCodeReports({ date: today }),
    { pollMs: LIST_POLL_MS },
  );

  const routesById = new Map(
    (assigned.data ?? []).map((route) => [route.routeId, route]),
  );
  const nextTrip = trips.data?.find((trip) => trip.status !== "FINISHED");
  const dayFinished =
    trips.data !== undefined &&
    trips.data.length > 0 &&
    trips.data.every((trip) => trip.status === "FINISHED");
  const firstName = user.name?.split(" ")[0] || "guía";

  // A trip may have been finished from another device while this one kept a
  // stale active trip in localStorage.
  useEffect(() => {
    if (!activeTrip || !trips.data) return;
    const trip = trips.data.find((item) => item.id === activeTrip.tripId);
    if (!trip || trip.status === "FINISHED") {
      void finishTracking(activeTrip.tripId).catch(() => undefined);
      clearActiveTrip(activeTrip.tripId);
    }
  }, [activeTrip, trips.data]);

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header__title">
          <h1>Hola, {firstName}</h1>
          <p className="page-header__subtitle">{formatLongDate(today)}</p>
        </div>
      </header>

      {activeTrip && (
        <Notice
          tone={
            tracking.status === "active" || tracking.status === "starting"
              ? "success"
              : tracking.status === "error"
                ? "warning"
                : "info"
          }
          title="Recorrido en curso"
        >
          <p>
            {tracking.message ??
              "Tu ubicación se está compartiendo mientras la app esté visible."}
          </p>
          <Link to={`/guide/trips/${activeTrip.tripId}`}>
            Volver al recorrido
          </Link>
        </Notice>
      )}

      <section className="section" aria-labelledby="trips-title">
        <div className="section__header">
          <h2 id="trips-title">Recorridos de hoy</h2>
          {trips.data && trips.data.length > 0 && (
            <span className="chip">
              {plural(trips.data.length, "recorrido", "recorridos")}
            </span>
          )}
        </div>
        <AsyncContent
          resource={trips}
          loadingLabel="Cargando tus recorridos…"
          isEmpty={(list) => list.length === 0}
          empty={
            <EmptyState
              icon={Bike}
              title="No tienes recorridos programados hoy"
            >
              La administración programa los recorridos del día. Si esperabas
              uno, consulta con tu líder zonal.
            </EmptyState>
          }
        >
          {(list) => (
            <ul className="trip-cards">
              {list.map((trip) => {
                const route = routesById.get(trip.routeId);
                const mine = route?.guides.find(
                  (guide) => guide.guideId === user.id,
                );
                return (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    route={route}
                    primary={trip === nextTrip}
                    guideRole={
                      mine
                        ? mine.primary
                          ? "Guía principal"
                          : "Guía de apoyo"
                        : null
                    }
                  />
                );
              })}
            </ul>
          )}
        </AsyncContent>
      </section>

      {dayFinished && trips.data && codes.data && (
        <DayClosing
          trips={trips.data}
          codes={codes.data}
          onReported={codes.reload}
        />
      )}

      <section className="section" aria-labelledby="routes-title">
        <h2 id="routes-title">Mis rutas asignadas</h2>
        <AsyncContent
          resource={assigned}
          loadingLabel="Cargando tus rutas…"
          isEmpty={(list) => list.length === 0}
          empty={
            <EmptyState icon={RouteIcon} title="Aún no tienes rutas asignadas">
              Tu líder zonal te asigna las rutas en la programación.
            </EmptyState>
          }
        >
          {(list) => (
            <ul className="list">
              {list.map((route) => {
                const primary = route.guides.some(
                  (guide) => guide.guideId === user.id && guide.primary,
                );
                return (
                  <li key={route.routeId} className="list-row">
                    <div className="list-row__top">
                      <div className="list-row__title">
                        <span className="route-code">{route.routeCode}</span>
                        <span>{route.schoolName}</span>
                      </div>
                      <span className="chip">
                        {primary ? "Principal" : "Apoyo"}
                      </span>
                    </div>
                    <dl className="facts">
                      <div>
                        <dt>Inicio</dt>
                        <dd>{formatTime(route.scheduledStartTime)}</dd>
                      </div>
                      <div>
                        <dt>Estudiantes</dt>
                        <dd>
                          {plural(
                            route.studentCount,
                            "estudiante",
                            "estudiantes",
                          )}
                        </dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>
          )}
        </AsyncContent>
      </section>
    </div>
  );
}
