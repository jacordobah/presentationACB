import { Siren } from "lucide-react";
import type { OperationalCode, RouteStatus, TripStatus } from "../api/types";
import { CODES } from "../lib/codes";
import { ROUTE_STATUS_LABELS, TRIP_STATUS_LABELS } from "../lib/labels";

const TRIP_STATUS_TONES: Record<TripStatus, string> = {
  SCHEDULED: "chip",
  IN_PROGRESS: "chip chip--progress",
  FINISHED: "chip chip--done",
};

const ROUTE_STATUS_TONES: Record<RouteStatus, string> = {
  DRAFT: "chip",
  IN_REVIEW: "chip chip--accent",
  APPROVED: "chip chip--done",
  REJECTED: "chip chip--late",
};

export function TripStatusChip({ status }: { status: TripStatus }) {
  return (
    <span className={TRIP_STATUS_TONES[status]}>
      {TRIP_STATUS_LABELS[status]}
    </span>
  );
}

export function RouteStatusChip({ status }: { status: RouteStatus }) {
  return (
    <span className={ROUTE_STATUS_TONES[status]}>
      {ROUTE_STATUS_LABELS[status]}
    </span>
  );
}

export function CodeChip({ code }: { code: OperationalCode }) {
  const emergency = CODES[code].emergency;
  return (
    <span className={emergency ? "chip chip--emergency" : "chip chip--accent"}>
      {emergency && <Siren size={14} aria-hidden="true" />}
      {code}
    </span>
  );
}
