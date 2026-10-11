import { Link } from "react-router";
import type { Trip, TripSummary } from "../../../api/types";
import { Notice } from "../../../components/Notice";
import { formatDuration, formatTime } from "../../../lib/dates";

export function TripFinished({
  trip,
  summary,
  backPath,
  backLabel,
}: {
  trip: Trip;
  summary: TripSummary | undefined;
  backPath: string;
  backLabel: string;
}) {
  const startedAt = summary?.startedAt ?? trip.startedAt;
  const endedAt = summary?.endedAt ?? trip.endedAt;
  const durationMinutes =
    summary?.durationMinutes ??
    (startedAt && endedAt
      ? Math.round(
          (new Date(endedAt).getTime() - new Date(startedAt).getTime()) /
            60_000,
        )
      : null);

  return (
    <div className="page">
      <Notice tone="success" title="Recorrido finalizado">
        Ya no se envía la ubicación de este recorrido.
      </Notice>
      <dl className="facts facts--large">
        {durationMinutes !== null && (
          <div>
            <dt>Duración</dt>
            <dd>{formatDuration(durationMinutes)}</dd>
          </div>
        )}
        {summary && (
          <div>
            <dt>Asistencia</dt>
            <dd>
              {summary.presentCount} de {summary.enrolledCount} presentes
            </dd>
          </div>
        )}
        {startedAt && (
          <div>
            <dt>Inicio</dt>
            <dd>{formatTime(startedAt)}</dd>
          </div>
        )}
        {endedAt && (
          <div>
            <dt>Fin</dt>
            <dd>{formatTime(endedAt)}</dd>
          </div>
        )}
      </dl>
      <Link to={backPath} className="button button--primary button--large">
        {backLabel}
      </Link>
    </div>
  );
}
