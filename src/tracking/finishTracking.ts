import { ApiError } from "../api/http";
import { finishTrackingSession } from "../api/tracking";
import {
  clearTracking,
  clearTrackingHandle,
  clearTrackingIdempotencyKey,
  readTracking,
  readTrackingHandle,
} from "./trackingStore";

function clearAll(tripId: number) {
  clearTracking(tripId);
  clearTrackingHandle(tripId);
  clearTrackingIdempotencyKey(tripId);
}

// Best effort: finishing the administrative trip must never depend on GPS.
// If the close fails, the stored handle remains so a later visit can retry it.
export async function finishTracking(tripId: number) {
  const record = readTracking(tripId);
  const handle = record ?? readTrackingHandle(tripId);
  if (!handle) {
    clearTrackingIdempotencyKey(tripId);
    return;
  }
  try {
    await finishTrackingSession(handle.trackingId);
  } catch (error) {
    // A missing or expired session is already closed from the app's point of
    // view; keep the record only for real temporary failures.
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 410)
    ) {
      clearAll(tripId);
      return;
    }
    throw error;
  }
  clearAll(tripId);
}
