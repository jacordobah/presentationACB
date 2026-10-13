import { Bike, Route as RouteIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { listCodeReports, reportCode } from "../../api/codes";
import { listRoutes } from "../../api/routes";
import { listTrips } from "../../api/trips";
import type { CodeReport, OperationalCode, Trip } from "../../api/types";
import { useSessionUser } from "../../auth/AuthContext";
import { AsyncContent } from "../../components/AsyncContent";
import { TripStatusChip } from "../../components/Chips";
import { Notice } from "../../components/Notice";
import { EmptyState } from "../../components/States";
import { errorMessage, useToast } from "../../components/toast/ToastContext";
import { useResource } from "../../hooks/useResource";
import { CODES } from "../../lib/codes";
import { LIST_POLL_MS } from "../../lib/config";
import { formatLongDate, formatTime, todayInBogota } from "../../lib/dates";
import { TRIP_LABELS, plural } from "../../lib/labels";
import { TRIP_ROW_TONES } from "../../lib/tones";

const OPEN_LABELS = {
  SCHEDULED: "Abrir recorrido",
  IN_PROGRESS: "Continuar recorrido",
  FINISHED: "Ver resumen",
};

function TripList({ trips }: { trips: Trip[] }) {
  const nextTrip = trips.find((trip) => trip.status !== "FINISHED");
  return (
    <ul className="list">
      {trips.map((trip) => (
        <li key={trip.id} className={`list-row ${TRIP_ROW_TONES[trip.status]}`}>
          <div className="list-row__top">
            <div className="list-row__title">
              <span className="route-code">{trip.routeCode}</span>
              <span>
                {trip.tripCode} {TRIP_LABELS[trip.tripCode]}
              </span>
            </div>
            <TripStatusChip status={trip.status} />
          </div>
          <dl className="facts">
            <div>
              <dt>Citación en PE01</dt>
              <dd>{formatTime(trip.citationTime)}</dd>
            </div>
            <div>
              <dt>Inicio</dt>
              <dd>{formatTime(trip.scheduledStart)}</dd>
            </div>
          </dl>
          <Link
            to={`/guide/trips/${trip.id}`}
            className={trip === nextTrip ? "button button--primary" : "button"}
          >
            {OPEN_LABELS[trip.status]}
          </Link>
        </li>
      ))}
    </ul>
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
  const mine = codes.filter((report) => report.userId === user.id);
  const reported = (code: OperationalCode) =>
    mine.some((report) => report.code === code);
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
      toast.show(
        code === "524"
          ? "Misión cumplida reportada."
          : "Disponibilidad reportada.",
        {
          tone: "success",
        },
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
  const trips = useResource(
    `trips:${today}`,
    () => listTrips({ date: today }),
    {
      pollMs: LIST_POLL_MS,
    },
  );
  const codes = useResource(
    `codes:${today}`,
    () => listCodeReports({ date: today }),
    {
      pollMs: LIST_POLL_MS,
    },
  );
  const routes = useResource("routes:mine", () => listRoutes());
  const dayFinished =
    trips.data !== undefined &&
    trips.data.length > 0 &&
    trips.data.every((trip) => trip.status === "FINISHED");

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header__title">
          <h1>Hoy</h1>
          <p className="page-header__subtitle">{formatLongDate(today)}</p>
        </div>
      </header>

      <section className="section" aria-labelledby="trips-title">
        <h2 id="trips-title">Mis recorridos</h2>
        <AsyncContent
          resource={trips}
          loadingLabel="Cargando tus recorridos…"
          isEmpty={(list) => list.length === 0}
          empty={
            <EmptyState
              icon={Bike}
              title="No tienes recorridos programados hoy"
            />
          }
        >
          {(list) => <TripList trips={list} />}
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
        <h2 id="routes-title">Mis rutas</h2>
        <AsyncContent resource={routes} loadingLabel="Cargando tus rutas…">
          {(list) => {
            const assigned = list.filter(
              (route) =>
                route.active &&
                route.guides.some((guide) => guide.guideId === user.id),
            );
            if (assigned.length === 0) {
              return (
                <EmptyState
                  icon={RouteIcon}
                  title="Aún no tienes rutas asignadas"
                >
                  Tu líder zonal te asigna las rutas en la programación.
                </EmptyState>
              );
            }
            return (
              <ul className="list">
                {assigned.map((route) => {
                  const primary = route.guides.some(
                    (guide) => guide.guideId === user.id && guide.primary,
                  );
                  return (
                    <li key={route.code} className="list-row">
                      <div className="list-row__top">
                        <div className="list-row__title">
                          <span className="route-code">{route.code}</span>
                          <span>{route.schoolName}</span>
                        </div>
                        <span className="chip">
                          {primary ? "Principal" : "Apoyo"}
                        </span>
                      </div>
                      <p className="muted">
                        {plural(
                          route.studentCount,
                          "estudiante",
                          "estudiantes",
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            );
          }}
        </AsyncContent>
      </section>
    </div>
  );
}
