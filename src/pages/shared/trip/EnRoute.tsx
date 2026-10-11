import { CircleCheck, Flag } from "lucide-react";
import { useEffect, useState } from "react";
import { finishTrip } from "../../../api/trips";
import type {
  MeetingPoint,
  Student,
  Trip,
  TripGeometry,
} from "../../../api/types";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { LocationNotice } from "../../../components/LocationNotice";
import { errorMessage, useToast } from "../../../components/toast/ToastContext";
import { useNow } from "../../../hooks/useNow";
import { formatCountdown, formatTime } from "../../../lib/dates";
import { distanceMeters, formatDistance } from "../../../lib/geo";
import { plural } from "../../../lib/labels";
import { clearActiveTrip } from "../../../location/activeTrip";
import type { Fix, LocationStatus } from "../../../location/LocationContext";
import { PointPanel } from "./PointPanel";
import { tripProgress, type TripProgress } from "./tripProgress";

function closestContaining(points: MeetingPoint[], fix: Fix | null) {
  if (!fix) return undefined;
  return points
    .map((point) => ({ point, distance: distanceMeters(fix, point.location) }))
    .filter(({ point, distance }) => distance <= point.radiusM)
    .sort((a, b) => a.distance - b.distance)[0]?.point;
}

function PointList({
  geometry,
  progress,
  focusCode,
  now,
}: {
  geometry: TripGeometry;
  progress: TripProgress;
  focusCode: string | undefined;
  now: number;
}) {
  return (
    <section className="section" aria-labelledby="points-title">
      <h2 id="points-title">Puntos de encuentro</h2>
      <ol className="point-progress">
        {geometry.meetingPoints.map((point) => {
          const state = progress.points[point.code];
          const className = state?.completedAt
            ? "point-progress__item point-progress__item--done"
            : state
              ? "point-progress__item point-progress__item--current"
              : "point-progress__item";
          return (
            <li
              key={point.code}
              className={className}
              aria-current={point.code === focusCode ? "step" : undefined}
            >
              <span className="point-progress__order">{point.order}</span>
              <span className="point-progress__name">{point.name}</span>
              <span className="point-progress__state">
                {state?.completedAt ? (
                  <>
                    <CircleCheck size={18} aria-hidden="true" />
                    {formatTime(state.completedAt)}
                  </>
                ) : state ? (
                  `En el punto ${formatCountdown(state.deadline - now)}`
                ) : (
                  "Pendiente"
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

interface EnRouteProps {
  trip: Trip;
  geometry: TripGeometry;
  students: Student[];
  progress: TripProgress;
  fix: Fix | null;
  locationStatus: LocationStatus;
  canOperate: boolean;
  onFocusChange: () => void;
  onFinished: () => void;
}

export function EnRoute({
  trip,
  geometry,
  students,
  progress,
  fix,
  locationStatus,
  canOperate,
  onFocusChange,
  onFinished,
}: EnRouteProps) {
  const toast = useToast();
  const now = useNow(1000);
  const [confirming, setConfirming] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const pending = geometry.meetingPoints.filter(
    (point) => !progress.points[point.code]?.completedAt,
  );
  const inside = closestContaining(pending, fix);
  const waiting = pending.find((point) => progress.points[point.code]);
  const focus = inside ?? waiting ?? pending[0];
  const { destination } = geometry;
  const destinationDistance = fix
    ? distanceMeters(fix, destination.location)
    : null;
  const atDestination =
    destinationDistance !== null && destinationDistance <= destination.radiusM;

  // Entering the geofence of a pending meeting point starts its wait timer.
  useEffect(() => {
    if (canOperate && inside) tripProgress.arriveAt(trip.id, inside.code);
  }, [canOperate, inside, trip.id]);

  const focusCode = focus?.code;
  useEffect(() => {
    onFocusChange();
  }, [focusCode, onFocusChange]);

  const handleFinish = async () => {
    setFinishing(true);
    try {
      const summary = await finishTrip(trip.id);
      tripProgress.finish(trip.id, summary);
      clearActiveTrip(trip.id);
      toast.show("Recorrido finalizado.", { tone: "success" });
      onFinished();
    } catch (error) {
      toast.show(errorMessage(error), { tone: "error" });
      setFinishing(false);
      setConfirming(false);
    }
  };

  return (
    <div className="trip-panel__content">
      <LocationNotice status={locationStatus} />
      {canOperate && focus && (
        <PointPanel
          key={focus.code}
          trip={trip}
          point={focus}
          students={students}
          progress={progress.points[focus.code]}
          fix={fix}
          now={now}
        />
      )}

      <PointList
        geometry={geometry}
        progress={progress}
        focusCode={focus?.code}
        now={now}
      />

      <section className="section finish" aria-labelledby="destination-title">
        <div className="section__header">
          <h2 id="destination-title">Destino</h2>
          {atDestination ? (
            <span className="chip chip--progress">Llegaste</span>
          ) : (
            destinationDistance !== null && (
              <span className="chip">
                A {formatDistance(destinationDistance)}
              </span>
            )
          )}
        </div>
        <p>{destination.name}</p>
        {canOperate && (
          <>
            <button
              type="button"
              className="button button--primary button--large button--block"
              disabled={!atDestination || finishing}
              onClick={() => setConfirming(true)}
            >
              <Flag size={24} aria-hidden="true" />
              Finalizar recorrido
            </button>
            {!atDestination && (
              <p className="field__hint">
                Se activa cuando llegues al destino.
              </p>
            )}
          </>
        )}
      </section>

      <ConfirmDialog
        open={confirming}
        title="¿Finalizar el recorrido?"
        confirmLabel="Finalizar recorrido"
        busy={finishing}
        onConfirm={handleFinish}
        onCancel={() => setConfirming(false)}
      >
        <p>
          Al finalizar, tu teléfono deja de enviar la ubicación del recorrido.
        </p>
        {pending.length > 0 && (
          <p>
            <strong>
              Quedan {plural(pending.length, "punto", "puntos")} sin completar.
            </strong>
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
