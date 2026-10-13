import { CircleCheck, Circle, MapPinCheck, Play } from "lucide-react";
import { useState } from "react";
import { reportCode } from "../../../api/codes";
import { validateFirstMeetingPoint } from "../../../api/routeGeometry";
import { startTrip } from "../../../api/trips";
import type {
  ArrivalResult,
  CodeReport,
  MeetingPointValidation,
  Trip,
  TripGeometry,
} from "../../../api/types";
import { useSessionUser } from "../../../auth/AuthContext";
import { LocationNotice } from "../../../components/LocationNotice";
import { Notice } from "../../../components/Notice";
import { errorMessage, useToast } from "../../../components/toast/ToastContext";
import { CODES } from "../../../lib/codes";
import { formatTime } from "../../../lib/dates";
import { distanceMeters, formatDistance } from "../../../lib/geo";
import { PUNCTUALITY_LABELS } from "../../../lib/labels";
import { setActiveTrip } from "../../../location/activeTrip";
import type { Fix, LocationStatus } from "../../../location/LocationContext";
import { tripProgress, type TripProgress } from "./tripProgress";

function PunctualityResult({ arrival }: { arrival: ArrivalResult }) {
  const tone =
    arrival.classification === "ON_TIME"
      ? "success"
      : arrival.classification === "LATE_NO_IMPACT"
        ? "warning"
        : "error";
  return (
    <Notice tone={tone} title={PUNCTUALITY_LABELS[arrival.classification]}>
      {arrival.classification === "ON_TIME"
        ? `Reportaste tu llegada a las ${formatTime(arrival.arrivedAt)}`
        : `Llegaste a las ${formatTime(arrival.arrivedAt)}, ${arrival.minutesLate} min después de la citación.`}
    </Notice>
  );
}

function ArrivalRoster({
  trip,
  arrivals,
  currentUserId,
}: {
  trip: Trip;
  arrivals: CodeReport[];
  currentUserId: number;
}) {
  const people = new Map<number, string>();
  trip.guides.forEach((guide) => people.set(guide.guideId, guide.name));
  trip.executors.forEach((executor) =>
    people.set(executor.userId, executor.name),
  );
  const arrivedCount = new Set(arrivals.map((report) => report.userId)).size;

  return (
    <section className="section" aria-labelledby="roster-title">
      <div className="section__header">
        <h2 id="roster-title">Llegadas al PE01</h2>
        <span
          className={
            arrivedCount >= trip.requiredGuides ? "chip chip--done" : "chip"
          }
        >
          {arrivedCount} de {trip.requiredGuides} requeridas
        </span>
      </div>
      <ul className="roster">
        {[...people].map(([userId, name]) => {
          const arrival = arrivals.find((report) => report.userId === userId);
          return (
            <li
              key={userId}
              className={
                arrival ? "roster__item roster__item--done" : "roster__item"
              }
            >
              {arrival ? (
                <CircleCheck size={22} aria-hidden="true" />
              ) : (
                <Circle size={22} aria-hidden="true" />
              )}
              <span className="roster__name">
                {name}
                {userId === currentUserId && (
                  <span className="muted"> (tú)</span>
                )}
              </span>
              <span className="roster__time">
                {arrival ? formatTime(arrival.notifiedAt) : "Sin reportar"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Why the geo API did not take the position as an arrival at the point.
function refusalMessage(validation: MeetingPointValidation, pointCode: string) {
  if (validation.status === "outside") {
    return `Estás a ${formatDistance(validation.distanceM)} del ${pointCode}; el radio permitido es ${formatDistance(validation.radiusM)}.`;
  }
  if (
    validation.reason === "accuracy_missing" ||
    validation.reason === "accuracy_exceeds_limit"
  ) {
    const accuracy =
      validation.accuracyM === null
        ? ""
        : ` (±${formatDistance(validation.accuracyM)})`;
    return `La precisión del GPS${accuracy} supera el máximo permitido de ±${formatDistance(validation.maxAccuracyM)}. Espera a tener mejor señal e intenta de nuevo.`;
  }
  return `Estás muy cerca del borde del área del ${pointCode} y no se puede confirmar tu llegada. Acércate más al punto e intenta de nuevo.`;
}

interface BeforeStartProps {
  trip: Trip;
  geometry: TripGeometry;
  codes: CodeReport[];
  progress: TripProgress;
  fix: Fix | null;
  locationStatus: LocationStatus;
  canOperate: boolean;
  onCodesChanged: () => void;
  onStarted: () => void;
}

export function BeforeStart({
  trip,
  geometry,
  codes,
  progress,
  fix,
  locationStatus,
  canOperate,
  onCodesChanged,
  onStarted,
}: BeforeStartProps) {
  const user = useSessionUser();
  const toast = useToast();
  const [busy, setBusy] = useState<"arrival" | "start" | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const firstPoint = geometry.meetingPoints[0];
  const distance = fix ? distanceMeters(fix, firstPoint.location) : null;
  const insideFirstPoint = distance !== null && distance <= firstPoint.radiusM;
  const arrivals = codes.filter(
    (report) => report.code === "523" && report.tripCode === trip.tripCode,
  );
  const myArrival = arrivals.find((report) => report.userId === user.id);
  const enoughArrivals =
    new Set(arrivals.map((report) => report.userId)).size >=
    trip.requiredGuides;

  const handleArrival = async () => {
    if (!fix) return;
    setBusy("arrival");
    setRefusal(null);
    try {
      const validation = await validateFirstMeetingPoint(geometry.geoRouteId, {
        latitude: fix.lat,
        longitude: fix.lng,
        accuracy: fix.accuracy,
        capturedAt: new Date(fix.timestamp).toISOString(),
      });
      if (validation.status !== "inside") {
        setRefusal(refusalMessage(validation, firstPoint.code));
        return;
      }
      const { arrival } = await reportCode({
        code: "523",
        label: CODES["523"].label,
        routeCode: trip.routeCode,
        tripCode: trip.tripCode,
        userId: user.id,
        location: fix,
      });
      if (arrival) tripProgress.recordArrival(trip.id, arrival);
      toast.show("Llegada reportada.", { tone: "success" });
      onCodesChanged();
    } catch (error) {
      toast.show(errorMessage(error), { tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const handleStart = async () => {
    if (!fix) return;
    setBusy("start");
    try {
      if (!progress.startReported) {
        await reportCode({
          code: trip.tripCode,
          label: CODES[trip.tripCode].label,
          routeCode: trip.routeCode,
          tripCode: trip.tripCode,
          userId: user.id,
          location: fix,
        });
        tripProgress.markStartReported(trip.id);
      }
      await startTrip(trip.id);
      setActiveTrip({
        tripId: trip.id,
        routeCode: trip.routeCode,
        tripCode: trip.tripCode,
        userId: user.id,
        date: trip.date,
      });
      toast.show("Recorrido iniciado.", { tone: "success" });
      onStarted();
    } catch (error) {
      toast.show(errorMessage(error), { tone: "error" });
      setBusy(null);
    }
  };

  return (
    <div className="trip-panel__content">
      <dl className="facts facts--large">
        <div>
          <dt>Citación en PE01</dt>
          <dd>{formatTime(trip.citationTime)}</dd>
        </div>
        <div>
          <dt>Inicio</dt>
          <dd>{formatTime(trip.scheduledStart)}</dd>
        </div>
      </dl>

      <div
        className={insideFirstPoint ? "distance distance--inside" : "distance"}
      >
        <span className="distance__label">
          {firstPoint.code} {firstPoint.name}
        </span>
        <span className="distance__value">
          {distance === null
            ? "Sin ubicación"
            : insideFirstPoint
              ? "Estás en el punto"
              : `A ${formatDistance(distance)}`}
        </span>
        {fix && fix.accuracy !== null && (
          <span className="distance__accuracy">
            Precisión ±{Math.round(fix.accuracy)} m
          </span>
        )}
      </div>
      <LocationNotice status={locationStatus} />

      <ArrivalRoster trip={trip} arrivals={arrivals} currentUserId={user.id} />

      {progress.arrival && <PunctualityResult arrival={progress.arrival} />}

      {!canOperate ? (
        <Notice tone="info">
          Para operar este recorrido primero debes asumirlo desde el detalle de
          la ruta.
        </Notice>
      ) : !myArrival ? (
        <div className="stack">
          {refusal && <p className="field__error">{refusal}</p>}
          <button
            type="button"
            className="button button--primary button--large button--block"
            disabled={!fix || busy !== null}
            onClick={handleArrival}
          >
            <MapPinCheck size={24} aria-hidden="true" />
            {busy === "arrival"
              ? "Enviando llegada…"
              : "Reportar llegada (523)"}
          </button>
        </div>
      ) : (
        <div className="stack">
          {!progress.arrival && (
            <Notice tone="success">
              Reportaste tu llegada a las {formatTime(myArrival.notifiedAt)}
            </Notice>
          )}
          <button
            type="button"
            className="button button--primary button--large button--block"
            disabled={!enoughArrivals || busy !== null || !fix}
            onClick={handleStart}
          >
            <Play size={24} aria-hidden="true" />
            {busy === "start"
              ? "Iniciando…"
              : `Iniciar recorrido (${trip.tripCode})`}
          </button>
          {!enoughArrivals && (
            <p className="field__hint">
              Puedes iniciar cuando{" "}
              {trip.requiredGuides === 1
                ? "el guía requerido haya"
                : `los ${trip.requiredGuides} guías requeridos hayan`}{" "}
              reportado su llegada.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
