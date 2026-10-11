import { CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { listCodeReports } from "../../api/codes";
import { listTrips } from "../../api/trips";
import type { CodeReport, Trip } from "../../api/types";
import { AsyncContent } from "../../components/AsyncContent";
import { EmptyState } from "../../components/States";
import { useNow } from "../../hooks/useNow";
import { useResource } from "../../hooks/useResource";
import { LIST_POLL_MS } from "../../lib/config";
import { formatElapsed, formatTime, todayInBogota } from "../../lib/dates";
import { TRIP_LABELS } from "../../lib/labels";

interface PendingItem {
  key: string;
  title: ReactNode;
  detail: string;
  link?: string;
}

function tripMembers(trip: Trip) {
  const members = new Map<number, string>();
  trip.guides.forEach((guide) => members.set(guide.guideId, guide.name));
  trip.executors.forEach((executor) =>
    members.set(executor.userId, executor.name),
  );
  return members;
}

function tripTitle(trip: Trip) {
  return (
    <>
      <span className="route-code">{trip.routeCode}</span>
      <span>
        {trip.tripCode} {TRIP_LABELS[trip.tripCode]}
      </span>
    </>
  );
}

function findPending(trips: Trip[], codes: CodeReport[], now: number) {
  const arrivedUsers = (trip: Trip) =>
    new Set(
      codes
        .filter(
          (code) =>
            code.code === "523" &&
            code.routeCode === trip.routeCode &&
            code.tripCode === trip.tripCode,
        )
        .map((code) => code.userId),
    );

  const missingArrivals: PendingItem[] = trips
    .filter(
      (trip) =>
        trip.status === "SCHEDULED" && now > Date.parse(trip.citationTime),
    )
    .flatMap((trip) => {
      const arrived = arrivedUsers(trip);
      if (arrived.size >= trip.requiredGuides) return [];
      const missing = [...tripMembers(trip)]
        .filter(([userId]) => !arrived.has(userId))
        .map(([, name]) => name);
      return [
        {
          key: `arrival-${trip.id}`,
          title: tripTitle(trip),
          detail: `Citación ${formatTime(trip.citationTime)}, ${formatElapsed(trip.citationTime, now)}. Sin 523: ${missing.join(", ") || "sin guías asignados"}.`,
          link: `/leader/routes/${trip.routeCode}?tab=today`,
        },
      ];
    });

  const notStarted: PendingItem[] = trips
    .filter(
      (trip) =>
        trip.status === "SCHEDULED" && now > Date.parse(trip.scheduledStart),
    )
    .map((trip) => ({
      key: `start-${trip.id}`,
      title: tripTitle(trip),
      detail: `Debía iniciar a las ${formatTime(trip.scheduledStart)}, ${formatElapsed(trip.scheduledStart, now)}.`,
      link: `/leader/routes/${trip.routeCode}?tab=today`,
    }));

  const guides = new Map<number, { name: string; trips: Trip[] }>();
  for (const trip of trips) {
    for (const guide of trip.guides) {
      const entry = guides.get(guide.guideId) ?? {
        name: guide.name,
        trips: [],
      };
      entry.trips.push(trip);
      guides.set(guide.guideId, entry);
    }
  }
  const missingMissionReport: PendingItem[] = [...guides]
    .filter(
      ([guideId, { trips: guideTrips }]) =>
        guideTrips.every((trip) => trip.status === "FINISHED") &&
        !codes.some((code) => code.code === "524" && code.userId === guideId),
    )
    .map(([guideId, { name, trips: guideTrips }]) => ({
      key: `mission-${guideId}`,
      title: <strong>{name}</strong>,
      detail: `Terminó ${guideTrips.length === 1 ? "su recorrido" : `sus ${guideTrips.length} recorridos`} y no ha reportado 524.`,
    }));

  return { missingArrivals, notStarted, missingMissionReport };
}

function PendingSection({
  title,
  items,
}: {
  title: string;
  items: PendingItem[];
}) {
  return (
    <section className="section" aria-label={title}>
      <div className="section__header">
        <h2>{title}</h2>
        <span
          className={items.length > 0 ? "chip chip--late" : "chip chip--done"}
        >
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="muted">Nada pendiente.</p>
      ) : (
        <ul className="list">
          {items.map((item) => (
            <li key={item.key} className="list-row list-row--late">
              <div className="list-row__title">{item.title}</div>
              <p>{item.detail}</p>
              {item.link && (
                <Link className="button" to={item.link}>
                  Ver recorridos de la ruta
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function PendingPage() {
  const today = todayInBogota();
  const now = useNow(30_000);
  const data = useResource(
    `pending:${today}`,
    async () => {
      const [trips, codes] = await Promise.all([
        listTrips({ date: today }),
        listCodeReports({ date: today }),
      ]);
      return { trips, codes };
    },
    { pollMs: LIST_POLL_MS },
  );

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header__title">
          <h1>Pendientes</h1>
          <p className="page-header__subtitle">
            Lo que falta en los recorridos de hoy.
          </p>
        </div>
      </header>
      <AsyncContent
        resource={data}
        loadingLabel="Revisando los recorridos de hoy…"
      >
        {({ trips, codes }) => {
          const pending = findPending(trips, codes, now);
          const total =
            pending.missingArrivals.length +
            pending.notStarted.length +
            pending.missingMissionReport.length;
          return (
            <>
              {total === 0 && (
                <EmptyState icon={CircleCheck} title="Todo en orden">
                  No hay recorridos atrasados ni reportes pendientes.
                </EmptyState>
              )}
              <PendingSection
                title="Pasaron la citación sin 523"
                items={pending.missingArrivals}
              />
              <PendingSection
                title="Pasaron la hora de inicio sin iniciar"
                items={pending.notStarted}
              />
              <PendingSection
                title="Terminaron y no reportaron 524"
                items={pending.missingMissionReport}
              />
            </>
          );
        }}
      </AsyncContent>
    </div>
  );
}
