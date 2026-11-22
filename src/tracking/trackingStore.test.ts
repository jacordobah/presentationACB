import { describe, expect, it } from "vitest";
import { stageTrackingObservation, type TrackingRecord } from "./trackingStore";

describe("reintento de observaciones GPS", () => {
  it("conserva el cuerpo exacto de una secuencia pendiente ante una nueva medición", () => {
    const record: TrackingRecord = {
      tripId: 1,
      trackingId: "tracking-test",
      credential: "synthetic-test-credential",
      nextSequence: 3,
      startedAt: 0,
      lastSentAt: null,
    };
    const first = {
      sequence: 3,
      latitude: 4.6,
      longitude: -74.1,
      accuracy_m: 5,
      captured_at: "2026-11-22T10:00:00.000Z",
    };
    const newer = {
      ...first,
      latitude: 4.7,
      captured_at: "2026-11-22T10:00:05.000Z",
    };
    const pending = stageTrackingObservation(record, first);
    const retry = stageTrackingObservation(pending, newer);
    expect(retry.pendingObservation).toEqual(first);
    expect(retry.nextSequence).toBe(3);
  });
});
