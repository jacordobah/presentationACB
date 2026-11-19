import { Siren } from "lucide-react";
import type { OperationalCode, TripStatus } from "../api/types";
import { CODES } from "../lib/codes";
import { TRIP_STATUS_LABELS } from "../lib/labels";

const TRIP_STATUS_TONES: Record<TripStatus, string> = {
  SCHEDULED: "chip",
  IN_PROGRESS: "chip chip--progress",
  FINISHED: "chip chip--done",
};

export function TripStatusChip({ status }: { status: TripStatus }) {
  return (
    <span className={TRIP_STATUS_TONES[status]}>
      {TRIP_STATUS_LABELS[status]}
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
