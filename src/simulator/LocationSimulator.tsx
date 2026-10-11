import {
  Flag,
  MapPin,
  Navigation,
  Pause,
  Play,
  SkipForward,
  Satellite,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLng, TripGeometry } from "../api/types";
import { readJson, removeKey, writeJson } from "../lib/storage";
import { useDeviceLocation } from "../location/LocationContext";
import { distanceAlong, lineLength, pointAlong } from "./routeWalk";
import "./LocationSimulator.css";

const STORAGE_KEY = "acb.simulator.position";
const WALK_SPEED_MPS = 15 / 3.6;
const WALK_STEP_MS = 1000;

export default function LocationSimulator({
  geometry,
  target,
}: {
  geometry: TripGeometry;
  target: { label: string; location: LatLng };
}) {
  const { fix, setSimulatedFix } = useDeviceLocation();
  const [open, setOpen] = useState(false);
  const [walking, setWalking] = useState(false);
  const fixRef = useRef(fix);
  const simulated = fix?.simulated ?? false;

  useEffect(() => {
    fixRef.current = fix;
  });

  const place = useCallback(
    (location: LatLng) => {
      setSimulatedFix({
        ...location,
        accuracy: 5,
        timestamp: Date.now(),
        simulated: true,
      });
      writeJson(STORAGE_KEY, location);
    },
    [setSimulatedFix],
  );

  // A reload in the middle of a demo keeps the simulated position instead of
  // jumping to the real GPS.
  useEffect(() => {
    const stored = readJson<LatLng>(STORAGE_KEY);
    if (stored) place(stored);
  }, [place]);

  useEffect(() => {
    if (!walking) return;
    const { line } = geometry;
    const total = lineLength(line);
    const start = fixRef.current;
    let travelled = start ? distanceAlong(line, start) : 0;
    const id = window.setInterval(() => {
      travelled = Math.min(
        total,
        travelled + (WALK_SPEED_MPS * WALK_STEP_MS) / 1000,
      );
      place(pointAlong(line, travelled));
      if (travelled >= total) setWalking(false);
    }, WALK_STEP_MS);
    return () => window.clearInterval(id);
  }, [walking, geometry, place]);

  const jumpTo = (location: LatLng) => {
    setWalking(false);
    place(location);
  };

  const useRealGps = () => {
    setWalking(false);
    setSimulatedFix(null);
    removeKey(STORAGE_KEY);
  };

  if (!open) {
    return (
      <button
        type="button"
        className="simulator-toggle"
        onClick={() => setOpen(true)}
        aria-expanded="false"
      >
        <Navigation size={20} aria-hidden="true" />
        Simulador
        {simulated && <span className="simulator-toggle__state">activo</span>}
      </button>
    );
  }

  const firstPoint = geometry.meetingPoints[0];
  return (
    <div className="simulator" role="group" aria-label="Simulador de ubicación">
      <div className="simulator__actions">
        <button type="button" onClick={useRealGps} aria-pressed={!simulated}>
          <Satellite size={18} aria-hidden="true" />
          Usar GPS real
        </button>
        <button type="button" onClick={() => jumpTo(firstPoint.location)}>
          <MapPin size={18} aria-hidden="true" />
          Ir a {firstPoint.code}
        </button>
        <button type="button" onClick={() => jumpTo(target.location)}>
          <SkipForward size={18} aria-hidden="true" />
          Ir al siguiente punto ({target.label})
        </button>
        <button
          type="button"
          onClick={() => jumpTo(geometry.destination.location)}
        >
          <Flag size={18} aria-hidden="true" />
          Ir al destino
        </button>
        <button
          type="button"
          onClick={() => setWalking((current) => !current)}
          aria-pressed={walking}
        >
          {walking ? (
            <Pause size={18} aria-hidden="true" />
          ) : (
            <Play size={18} aria-hidden="true" />
          )}
          {walking ? "Pausar avance" : "Avanzar por la ruta"}
        </button>
      </div>
      <button
        type="button"
        className="simulator__close"
        onClick={() => setOpen(false)}
        aria-label="Cerrar simulador"
      >
        <X size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
