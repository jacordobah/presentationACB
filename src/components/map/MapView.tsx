import "leaflet/dist/leaflet.css";
import { useEffect, type ReactNode } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LatLng } from "../../api/types";
import { reducedMotion } from "./motion";
import "./map.css";

const BOGOTA: LatLng = { lat: 4.6097, lng: -74.0817 };

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function ResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export function MapView({
  children,
  className,
  label,
}: {
  children?: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div
      className={className ? `map ${className}` : "map"}
      role="region"
      aria-label={label}
    >
      <MapContainer
        center={BOGOTA}
        zoom={14}
        className="map__canvas"
        zoomAnimation={!reducedMotion}
        fadeAnimation={!reducedMotion}
        markerZoomAnimation={!reducedMotion}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution={OSM_ATTRIBUTION}
          maxZoom={19}
        />
        <ResizeWatcher />
        {children}
      </MapContainer>
    </div>
  );
}
