import { Circle, Marker, Polyline, Tooltip } from "react-leaflet";
import type { TripGeometry } from "../../api/types";
import { distanceMeters } from "../../lib/geo";
import {
  destinationIcon,
  meetingPointIcon,
  type PointMarkerState,
} from "./markers";

const LINE_STYLES = {
  active: { color: "#1f4fd1", weight: 6, opacity: 0.9 },
  secondary: { color: "#006f7a", weight: 5, opacity: 0.75, dashArray: "8 10" },
  muted: { color: "#46505e", weight: 4, opacity: 0.55 },
};

const GEOFENCE_STYLE = {
  color: "#006f7a",
  weight: 2,
  fillColor: "#006f7a",
  fillOpacity: 0.08,
};

export type RouteLineStyle = keyof typeof LINE_STYLES;

interface RouteLayerProps {
  geometry: TripGeometry;
  lineStyle?: RouteLineStyle;
  pointStates?: Record<string, PointMarkerState>;
  showPoints?: boolean;
  showGeofences?: boolean;
}

export function RouteLayer({
  geometry,
  lineStyle = "active",
  pointStates,
  showPoints = true,
  showGeofences = false,
}: RouteLayerProps) {
  const { meetingPoints, destination } = geometry;
  const lastPoint = meetingPoints.at(-1);
  // A 542 trip ends at its last meeting point, which then doubles as the
  // destination marker.
  const endsAtLastPoint =
    lastPoint !== undefined &&
    distanceMeters(lastPoint.location, destination.location) < 5;

  return (
    <>
      <Polyline
        positions={geometry.line}
        pathOptions={LINE_STYLES[lineStyle]}
      />
      {showPoints &&
        showGeofences &&
        meetingPoints.map((point) => (
          <Circle
            key={`fence-${point.code}`}
            center={point.location}
            radius={point.radiusM}
            pathOptions={GEOFENCE_STYLE}
          />
        ))}
      {showPoints &&
        meetingPoints.map((point) => (
          <Marker
            key={point.code}
            position={point.location}
            icon={meetingPointIcon(
              point.order,
              pointStates?.[point.code] ?? "pending",
              endsAtLastPoint && point === lastPoint,
            )}
          >
            <Tooltip>
              {point.code} {point.name}
            </Tooltip>
          </Marker>
        ))}
      {showPoints && !endsAtLastPoint && (
        <Marker position={destination.location} icon={destinationIcon()}>
          <Tooltip>Destino: {destination.name}</Tooltip>
        </Marker>
      )}
    </>
  );
}
