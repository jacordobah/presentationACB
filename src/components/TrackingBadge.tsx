import { useTracking, type TrackingStatus } from "../tracking/TrackingContext";

const LABELS: Record<TrackingStatus, string> = {
  idle: "",
  disabled: "GPS apagado",
  starting: "Conectando GPS",
  active: "GPS activo",
  paused: "GPS pausado",
  retrying: "GPS reintentando",
  error: "GPS sin enviar",
};

const TONES: Record<TrackingStatus, string> = {
  idle: "chip",
  disabled: "chip",
  starting: "chip chip--progress",
  active: "chip chip--done",
  paused: "chip chip--late",
  retrying: "chip chip--late",
  error: "chip chip--late",
};

export function TrackingBadge() {
  const { status, message } = useTracking();
  if (status === "idle") return null;
  return (
    <span className={TONES[status]} title={message ?? undefined}>
      {LABELS[status]}
    </span>
  );
}
