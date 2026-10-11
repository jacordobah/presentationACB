import { Circle, CircleMarker, Tooltip } from "react-leaflet";
import type { Fix } from "../../location/LocationContext";

const ACCURACY_STYLE = {
  color: "#1f4fd1",
  weight: 1,
  fillColor: "#1f4fd1",
  fillOpacity: 0.12,
};

const DOT_STYLE = {
  color: "#ffffff",
  weight: 3,
  fillColor: "#1f4fd1",
  fillOpacity: 1,
};

export function UserMarker({ fix }: { fix: Fix }) {
  return (
    <>
      {fix.accuracy !== null && (
        <Circle
          center={fix}
          radius={fix.accuracy}
          pathOptions={ACCURACY_STYLE}
        />
      )}
      <CircleMarker center={fix} radius={10} pathOptions={DOT_STYLE}>
        <Tooltip>
          {fix.simulated ? "Tu ubicación (simulada)" : "Tu ubicación"}
        </Tooltip>
      </CircleMarker>
    </>
  );
}
