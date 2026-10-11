import { useState } from "react";
import type { TripCode, TripGeometry } from "../api/types";
import { formatKilometers } from "../lib/geo";
import { TRIP_LABELS } from "../lib/labels";
import { MAX_ROUTE_LENGTH_M, MAX_TRIP_LENGTH_M } from "../lib/rules";
import { FitBounds } from "./map/FitBounds";
import { MapView } from "./map/MapView";
import { RouteLayer } from "./map/RouteLayer";
import "./RoutePreview.css";

const TRIP_CODES: TripCode[] = ["541", "542"];

function LengthRow({
  label,
  lengthM,
  limitM,
}: {
  label: string;
  lengthM: number | null;
  limitM: number;
}) {
  const exceeds = lengthM !== null && lengthM > limitM;
  const ratio = lengthM === null ? 0 : Math.min(1, lengthM / limitM);
  return (
    <div className="length-row">
      <div className="length-row__top">
        <span className="length-row__label">{label}</span>
        <span>
          <strong>
            {lengthM === null ? "Sin trazado" : formatKilometers(lengthM)}
          </strong>
          <span className="muted"> de {formatKilometers(limitM)}</span>
        </span>
      </div>
      <div
        className={exceeds ? "meter meter--over" : "meter"}
        role="meter"
        aria-label={`${label}: ${lengthM === null ? "sin trazado" : formatKilometers(lengthM)}`}
        aria-valuemin={0}
        aria-valuemax={limitM}
        aria-valuenow={lengthM ?? 0}
      >
        <span style={{ width: `${ratio * 100}%` }} />
      </div>
      {exceeds && <span className="chip chip--late">Supera el máximo</span>}
    </div>
  );
}

export function LengthSummary({ geometries }: { geometries: TripGeometry[] }) {
  const lengthOf = (code: TripCode) =>
    geometries.find((geometry) => geometry.tripCode === code)?.lengthM ?? null;
  const total = geometries.reduce((sum, geometry) => sum + geometry.lengthM, 0);
  return (
    <div className="length-summary">
      {TRIP_CODES.map((code) => (
        <LengthRow
          key={code}
          label={`${code} ${TRIP_LABELS[code]}`}
          lengthM={lengthOf(code)}
          limitM={MAX_TRIP_LENGTH_M}
        />
      ))}
      <LengthRow
        label="Total de la ruta"
        lengthM={geometries.length > 0 ? total : null}
        limitM={MAX_ROUTE_LENGTH_M}
      />
    </div>
  );
}

function MeetingPointList({ geometry }: { geometry: TripGeometry }) {
  return (
    <ol className="point-list">
      {geometry.meetingPoints.map((point) => (
        <li key={point.code}>
          <span className="point-list__code">{point.code}</span>
          <div>
            <strong>{point.name}</strong>
            {point.description && (
              <p className="small muted">{point.description}</p>
            )}
          </div>
        </li>
      ))}
      <li>
        <span className="point-list__code">Destino</span>
        <strong>{geometry.destination.name}</strong>
      </li>
    </ol>
  );
}

export function RoutePreview({
  routeCode,
  geometries,
}: {
  routeCode: string;
  geometries: TripGeometry[];
}) {
  const [tripCode, setTripCode] = useState<TripCode>("541");
  const selected =
    geometries.find((geometry) => geometry.tripCode === tripCode) ??
    geometries[0];
  const fitKey = geometries
    .map((geometry) => `${geometry.tripCode}:${geometry.lengthM}`)
    .join("|");

  return (
    <div className="route-preview">
      <div
        className="segmented"
        role="group"
        aria-label="Recorrido que se muestra"
      >
        {TRIP_CODES.map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={selected?.tripCode === code}
            disabled={
              !geometries.some((geometry) => geometry.tripCode === code)
            }
            onClick={() => setTripCode(code)}
          >
            {code} {TRIP_LABELS[code]}
          </button>
        ))}
      </div>
      <MapView
        className="route-preview__map"
        label={`Mapa de la ruta ${routeCode}`}
      >
        {geometries.map((geometry) => (
          <RouteLayer
            key={geometry.tripCode}
            geometry={geometry}
            lineStyle={geometry === selected ? "active" : "muted"}
            showPoints={geometry === selected}
          />
        ))}
        <FitBounds
          points={geometries.flatMap((geometry) => geometry.line)}
          fitKey={`${routeCode}|${fitKey}`}
        />
      </MapView>
      <LengthSummary geometries={geometries} />
      {selected && <MeetingPointList geometry={selected} />}
    </div>
  );
}
