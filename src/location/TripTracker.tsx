import { useEffect, useRef } from "react";
import { sendPosition } from "../api/positions";
import { useSessionUser } from "../auth/AuthContext";
import { useWakeLock } from "../hooks/useWakeLock";
import { POSITION_INTERVAL_MS } from "../lib/config";
import { useActiveTrip, type ActiveTrip } from "./activeTrip";
import { useDeviceLocation, type Fix } from "./LocationContext";

const STALE_FIX_MS = 2 * 60_000;

export function TripTracker() {
  const user = useSessionUser();
  const trip = useActiveTrip(user.id);
  return trip ? <PositionReporter trip={trip} /> : null;
}

function PositionReporter({ trip }: { trip: ActiveTrip }) {
  const { fix } = useDeviceLocation();
  const fixRef = useRef<Fix | null>(fix);
  const { tripId, routeCode, tripCode, userId } = trip;
  useWakeLock(true);

  useEffect(() => {
    fixRef.current = fix;
  }, [fix]);

  useEffect(() => {
    const report = () => {
      const latest = fixRef.current;
      if (!latest) return;
      const now = Date.now();
      if (!latest.simulated && now - latest.timestamp > STALE_FIX_MS) return;
      // A failed send is not retried: the next tick sends a fresher position.
      sendPosition({
        userId,
        routeCode,
        tripCode,
        latitude: latest.lat,
        longitude: latest.lng,
        accuracy: latest.accuracy,
        recordedAt: new Date(
          latest.simulated ? now : latest.timestamp,
        ).toISOString(),
      }).catch(() => undefined);
    };
    report();
    const id = window.setInterval(report, POSITION_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [tripId, routeCode, tripCode, userId]);

  return null;
}
