import { latLngBounds } from "leaflet";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import type { LatLng } from "../../api/types";
import { reducedMotion } from "./motion";

// Fits the map to the points whenever fitKey changes, not on every new array of
// points, so the map does not jump while the user is panning around.
export function FitBounds({
  points,
  fitKey,
  maxZoom = 17,
}: {
  points: LatLng[];
  fitKey: string;
  maxZoom?: number;
}) {
  const map = useMap();
  const pointsRef = useRef(points);

  useEffect(() => {
    pointsRef.current = points;
  });

  useEffect(() => {
    const current = pointsRef.current;
    if (current.length === 0) return;
    map.fitBounds(latLngBounds(current), {
      padding: [36, 36],
      maxZoom,
      animate: !reducedMotion,
    });
  }, [map, fitKey, maxZoom]);

  return null;
}

export function FlyTo({
  point,
  flyKey,
}: {
  point: LatLng | null;
  flyKey: string;
}) {
  const map = useMap();
  const pointRef = useRef(point);

  useEffect(() => {
    pointRef.current = point;
  });

  useEffect(() => {
    const target = pointRef.current;
    if (!target) return;
    map.setView(target, Math.max(map.getZoom(), 16), {
      animate: !reducedMotion,
    });
  }, [map, flyKey]);

  return null;
}
