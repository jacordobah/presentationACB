import {
  readJson,
  readSessionJson,
  removeKey,
  removeSessionKey,
  writeJson,
  writeSessionJson,
} from "../lib/storage";
import type { TrackingObservationInput } from "../api/tracking";

export interface TrackingRecord {
  tripId: number;
  trackingId: string;
  credential: string;
  nextSequence: number;
  startedAt: number;
  lastSentAt: number | null;
  // Persist the exact body until acknowledged. Reusing its sequence with a
  // newer fix would turn an uncertain success into a sequence conflict.
  pendingObservation?: TrackingObservationInput;
}

export interface TrackingHandle {
  tripId: number;
  trackingId: string;
}

const recordKey = (tripId: number) => `acb.tracking.${tripId}`;
const handleKey = (tripId: number) => `acb.trackingHandle.${tripId}`;
const idempotencyKey = (tripId: number) => `acb.trackingKey.${tripId}`;

export function stageTrackingObservation(
  record: TrackingRecord,
  observation: TrackingObservationInput,
): TrackingRecord {
  return record.pendingObservation
    ? record
    : { ...record, pendingObservation: observation };
}

export function readTracking(tripId: number) {
  return readSessionJson<TrackingRecord>(recordKey(tripId));
}

export function saveTracking(record: TrackingRecord) {
  writeSessionJson(recordKey(record.tripId), record);
}

export function clearTracking(tripId: number) {
  removeSessionKey(recordKey(tripId));
}

// The tracking id is not sensitive and survives a tab close, so a later visit
// can still finish the GPS session even if the observation credential is gone.
export function saveTrackingHandle(handle: TrackingHandle) {
  writeJson(handleKey(handle.tripId), handle);
}

export function readTrackingHandle(tripId: number) {
  return readJson<TrackingHandle>(handleKey(tripId));
}

export function clearTrackingHandle(tripId: number) {
  removeKey(handleKey(tripId));
}

// The key survives reloads and tab closes so a lost create response can be
// replayed instead of opening a second GPS session for the same trip.
export function getTrackingIdempotencyKey(tripId: number) {
  const existing = readJson<string>(idempotencyKey(tripId));
  if (existing) return existing;
  const value =
    globalThis.crypto?.randomUUID?.() ??
    `trip-${tripId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  writeJson(idempotencyKey(tripId), value);
  return value;
}

export function clearTrackingIdempotencyKey(tripId: number) {
  removeKey(idempotencyKey(tripId));
}
