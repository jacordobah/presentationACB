import { LocateFixed } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { TripGeometry } from "../../../api/types";
import { FitBounds, FlyTo } from "../../../components/map/FitBounds";
import { MapView } from "../../../components/map/MapView";
import type { PointMarkerState } from "../../../components/map/markers";
import { RouteLayer } from "../../../components/map/RouteLayer";
import { UserMarker } from "../../../components/map/UserMarker";
import type { Fix } from "../../../location/LocationContext";

export function TripMap({
  geometry,
  fix,
  pointStates,
  overlay,
}: {
  geometry: TripGeometry;
  fix: Fix | null;
  pointStates?: Record<string, PointMarkerState>;
  overlay?: ReactNode;
}) {
  const [centerRequests, setCenterRequests] = useState(0);

  return (
    <div className="trip-map">
      <MapView className="trip-map__view" label="Mapa del recorrido">
        <RouteLayer
          geometry={geometry}
          pointStates={pointStates}
          showGeofences
        />
        {fix && <UserMarker fix={fix} />}
        <FitBounds
          points={geometry.line}
          fitKey={`${geometry.routeCode}-${geometry.tripCode}`}
        />
        {centerRequests > 0 && (
          <FlyTo point={fix} flyKey={String(centerRequests)} />
        )}
      </MapView>
      <div className="map-overlay trip-map__controls">
        <button
          type="button"
          className="map-button"
          disabled={!fix}
          onClick={() => setCenterRequests((count) => count + 1)}
          aria-label="Centrar en mi ubicación"
        >
          <LocateFixed size={24} aria-hidden="true" />
        </button>
      </div>
      {overlay}
    </div>
  );
}
