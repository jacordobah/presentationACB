import { ArrowLeft, MessageSquareWarning } from "lucide-react";
import { Link } from "react-router";
import type { Trip } from "../../../api/types";
import { TripStatusChip } from "../../../components/Chips";
import { TRIP_LABELS } from "../../../lib/labels";

export function TripHeader({
  trip,
  backPath,
  onReport,
}: {
  trip: Trip;
  backPath: string;
  onReport?: () => void;
}) {
  return (
    <div className="trip-header">
      <Link
        to={backPath}
        className="button button--quiet button--icon"
        aria-label="Volver"
      >
        <ArrowLeft size={24} aria-hidden="true" />
      </Link>
      <div className="trip-header__title">
        <div className="trip-header__line">
          <h1 className="route-code">{trip.routeCode}</h1>
          <TripStatusChip status={trip.status} />
        </div>
        <span className="trip-header__trip">
          {trip.tripCode} {TRIP_LABELS[trip.tripCode]}
        </span>
      </div>
      {onReport && (
        <button
          type="button"
          className="button trip-header__report"
          onClick={onReport}
        >
          <MessageSquareWarning size={22} aria-hidden="true" />
          <span>Reportar novedad</span>
        </button>
      )}
    </div>
  );
}
