import { useSessionUser } from "../auth/AuthContext";
import { useWakeLock } from "../hooks/useWakeLock";
import { useActiveTrip } from "./activeTrip";

// Keeps the screen on while this device has a trip in progress, on any page.
export function TripTracker() {
  const user = useSessionUser();
  const trip = useActiveTrip(user.id);
  useWakeLock(trip !== null);
  return null;
}
