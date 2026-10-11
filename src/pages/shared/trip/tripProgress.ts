import { useSyncExternalStore } from "react";
import type {
  ArrivalResult,
  TripGeometry,
  TripSummary,
} from "../../../api/types";
import type { PointMarkerState } from "../../../components/map/markers";
import { EXTENDED_WAIT_MS, WAIT_MS } from "../../../lib/rules";
import { readJson, writeJson } from "../../../lib/storage";

export interface PointProgress {
  arrivedAt: number;
  deadline: number;
  extended: boolean;
  completedAt?: number;
}

export interface TripProgress {
  arrival?: ArrivalResult;
  startReported?: boolean;
  points: Record<string, PointProgress>;
  summary?: TripSummary;
}

const EMPTY_PROGRESS: TripProgress = { points: {} };
const cache = new Map<number, TripProgress>();
const listeners = new Set<() => void>();

const storageKey = (tripId: number) => `acb.trip.${tripId}`;

function read(tripId: number) {
  let progress = cache.get(tripId);
  if (!progress) {
    progress = readJson<TripProgress>(storageKey(tripId)) ?? EMPTY_PROGRESS;
    cache.set(tripId, progress);
  }
  return progress;
}

function update(
  tripId: number,
  change: (progress: TripProgress) => TripProgress,
) {
  const current = read(tripId);
  const next = change(current);
  if (next === current) return;
  cache.set(tripId, next);
  writeJson(storageKey(tripId), next);
  listeners.forEach((listener) => listener());
}

function updatePoint(
  tripId: number,
  code: string,
  change: (point: PointProgress | undefined) => PointProgress | undefined,
) {
  update(tripId, (progress) => {
    const point = change(progress.points[code]);
    if (!point || point === progress.points[code]) return progress;
    return { ...progress, points: { ...progress.points, [code]: point } };
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Progress lives outside React and in localStorage, keyed by trip, so a reload
// in the middle of a trip resumes at the same step with the same timers.
export const tripProgress = {
  recordArrival(tripId: number, arrival: ArrivalResult) {
    update(tripId, (progress) => ({ ...progress, arrival }));
  },
  markStartReported(tripId: number) {
    update(tripId, (progress) => ({ ...progress, startReported: true }));
  },
  arriveAt(tripId: number, code: string) {
    updatePoint(tripId, code, (point) => {
      if (point) return point;
      const now = Date.now();
      return { arrivedAt: now, deadline: now + WAIT_MS, extended: false };
    });
  },
  extendWait(tripId: number, code: string) {
    updatePoint(tripId, code, (point) =>
      point && !point.extended
        ? {
            ...point,
            deadline: point.arrivedAt + EXTENDED_WAIT_MS,
            extended: true,
          }
        : point,
    );
  },
  complete(tripId: number, code: string) {
    const now = Date.now();
    updatePoint(tripId, code, (point) => ({
      ...(point ?? { arrivedAt: now, deadline: now, extended: false }),
      completedAt: now,
    }));
  },
  finish(tripId: number, summary: TripSummary) {
    update(tripId, (progress) => ({ ...progress, summary }));
  },
};

export function useTripProgress(tripId: number) {
  return useSyncExternalStore(subscribe, () => read(tripId));
}

export function pointStatesFor(geometry: TripGeometry, progress: TripProgress) {
  const states: Record<string, PointMarkerState> = {};
  for (const point of geometry.meetingPoints) {
    const state = progress.points[point.code];
    states[point.code] = state?.completedAt
      ? "done"
      : state
        ? "current"
        : "pending";
  }
  return states;
}
