import { Camera, CircleCheck, Circle, Play } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { reportCode } from "../../../api/codes";
import { uploadPhoto } from "../../../api/photos";
import { startTrip } from "../../../api/trips";
import type {
  ArrivalResult,
  CodeReport,
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
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"arrival" | "start" | null>(null);
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

  const handleSelfie = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !fix) return;
    setBusy("arrival");
    try {
      const context = {
        userId: user.id,
        routeCode: trip.routeCode,
        tripCode: trip.tripCode,
      };
      const photoId = await uploadPhoto(file, { ...context, code: "523" });
      const { arrival } = await reportCode({
        ...context,
        code: "523",
        label: CODES["523"].label,
        location: fix,
        photoId,
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
          {distance !== null && !insideFirstPoint && (
            <p className="field__error">
              Estás a {formatDistance(distance)} del {firstPoint.code}. Acércate
              al punto para reportar tu llegada.
            </p>
          )}
          <button
            type="button"
            className="button button--primary button--large button--block"
            disabled={!insideFirstPoint || busy !== null}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera size={24} aria-hidden="true" />
            {busy === "arrival"
              ? "Enviando llegada…"
              : "Reportar llegada (523)"}
          </button>
          <p className="field__hint">
            Se abre la cámara frontal para tomar tu selfie.
          </p>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="user"
            hidden
            onChange={handleSelfie}
          />
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
