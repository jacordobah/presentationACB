import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { Marker } from "react-leaflet";
import { listCodeReports } from "../../api/codes";
import { listLatestPositions } from "../../api/positions";
import { listTripGeometries } from "../../api/routeGeometry";
import type {
  CodeReport,
  LatestPosition,
  LatLng,
  TripCode,
} from "../../api/types";
import { listZones } from "../../api/zones";
import { useSessionUser } from "../../auth/AuthContext";
import { CodeChip } from "../../components/Chips";
import { FitBounds } from "../../components/map/FitBounds";
import { MapView } from "../../components/map/MapView";
import { caravanIcon } from "../../components/map/markers";
import { RouteLayer } from "../../components/map/RouteLayer";
import { ErrorState } from "../../components/States";
import { useNow } from "../../hooks/useNow";
import { useResource } from "../../hooks/useResource";
import { CODES, isEmergency } from "../../lib/codes";
import { POLL_INTERVAL_MS } from "../../lib/config";
import { formatElapsed, formatTime, todayInBogota } from "../../lib/dates";
import { TRIP_LABELS } from "../../lib/labels";
import "./LiveMapPage.css";

interface Caravan {
  key: string;
  routeCode: string;
  tripCode: TripCode;
  location: LatLng;
  recordedAt: string;
  people: string[];
  latestCode: CodeReport | undefined;
}

// Guides on the same trip ride together, so their positions are shown as one
// caravan.
function buildCaravans(positions: LatestPosition[], codes: CodeReport[]) {
  const caravans = new Map<string, Caravan>();
  for (const position of positions) {
    const key = `${position.routeCode}-${position.tripCode}`;
    const name = position.userName ?? "Guía";
    const caravan = caravans.get(key);
    if (!caravan) {
      caravans.set(key, {
        key,
        routeCode: position.routeCode,
        tripCode: position.tripCode,
        location: position.location,
        recordedAt: position.recordedAt,
        people: [name],
        latestCode: codes.find(
          (code) =>
            code.routeCode === position.routeCode &&
            code.tripCode === position.tripCode,
        ),
      });
    } else {
      caravan.people.push(name);
      if (position.recordedAt > caravan.recordedAt) {
        caravan.location = position.location;
        caravan.recordedAt = position.recordedAt;
      }
    }
  }
  return [...caravans.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function CaravanPanel({
  caravan,
  onClose,
}: {
  caravan: Caravan;
  onClose: () => void;
}) {
  const now = useNow(5000);
  const { latestCode } = caravan;
  return (
    <section
      className="caravan-panel"
      aria-label={`Recorrido ${caravan.routeCode}`}
    >
      <div className="caravan-panel__header">
        <div className="list-row__title">
          <span className="route-code">{caravan.routeCode}</span>
          <span>
            {caravan.tripCode} {TRIP_LABELS[caravan.tripCode]}
          </span>
        </div>
        <button
          type="button"
          className="button button--quiet button--icon"
          onClick={onClose}
          aria-label="Cerrar detalle"
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>
      <dl className="facts">
        <div>
          <dt>{caravan.people.length === 1 ? "Guía" : "Guías"}</dt>
          <dd>{caravan.people.join(", ")}</dd>
        </div>
        <div>
          <dt>Última actualización</dt>
          <dd>
            {formatElapsed(caravan.recordedAt, now)},{" "}
            {formatTime(caravan.recordedAt)}
          </dd>
        </div>
      </dl>
      <div
        className={
          latestCode && isEmergency(latestCode.code)
            ? "last-code last-code--emergency"
            : "last-code"
        }
      >
        <span className="small muted">Último código</span>
        {latestCode ? (
          <span className="cluster">
            <CodeChip code={latestCode.code} />
            <strong>{CODES[latestCode.code].label}</strong>
            <span className="muted">{formatTime(latestCode.notifiedAt)}</span>
          </span>
        ) : (
          <span>Sin códigos hoy</span>
        )}
      </div>
    </section>
  );
}

export default function LiveMapPage() {
  const user = useSessionUser();
  const isManager = user.role === "MANAGER";
  const [zone, setZone] = useState("");
  const [followed, setFollowed] = useState<string[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const zoneFilter = isManager ? zone || null : user.zone;
  const zoneKey = zoneFilter ?? "all";
  const today = todayInBogota();

  const zones = useResource(isManager ? "zones" : null, listZones);
  const live = useResource(
    `live:${zoneKey}:${today}`,
    async () => {
      const [positions, codes] = await Promise.all([
        listLatestPositions(zoneFilter),
        listCodeReports({ date: today, zone: zoneFilter }),
      ]);
      return buildCaravans(positions, codes);
    },
    { pollMs: POLL_INTERVAL_MS },
  );
  const geometries = useResource(`geometry:zone:${zoneKey}`, () =>
    listTripGeometries({ zone: zoneFilter }),
  );

  const caravans = live.data ?? [];
  const routeCodes = [...new Set(caravans.map((caravan) => caravan.routeCode))];
  const visible = followed.length
    ? caravans.filter((caravan) => followed.includes(caravan.routeCode))
    : caravans;
  const selected = visible.find((caravan) => caravan.key === selectedKey);
  const geometryOf = useMemo(
    () => (caravan: Caravan) =>
      geometries.data?.find(
        (geometry) =>
          geometry.routeCode === caravan.routeCode &&
          geometry.tripCode === caravan.tripCode,
      ),
    [geometries.data],
  );
  // The view fits the visible caravans together with their whole routes, so a
  // followed caravan stays in view as it moves without the map re-centering on
  // every update.
  const fitPoints = useMemo(
    () =>
      visible.flatMap((caravan) => [
        caravan.location,
        ...(geometryOf(caravan)?.line ?? []),
      ]),
    [visible, geometryOf],
  );
  const fitKey = useMemo(
    () =>
      `${zoneKey}:${visible.map((caravan) => caravan.key).join("|")}:${geometries.data !== undefined}`,
    [zoneKey, visible, geometries.data],
  );

  const toggleFollow = (routeCode: string) =>
    setFollowed((current) =>
      current.includes(routeCode)
        ? current.filter((code) => code !== routeCode)
        : [...current, routeCode],
    );

  return (
    <div className="live-page">
      <div className="live-toolbar">
        <h1 className="visually-hidden">Mapa en vivo</h1>
        {isManager && (
          <label className="live-zone">
            <span className="visually-hidden">Zona</span>
            <select
              className="input"
              value={zone}
              onChange={(event) => {
                setZone(event.target.value);
                setFollowed([]);
                setSelectedKey(null);
              }}
            >
              <option value="">Todas las zonas</option>
              {zones.data?.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="chip-filter" role="group" aria-label="Seguir rutas">
          <button
            type="button"
            aria-pressed={followed.length === 0}
            onClick={() => setFollowed([])}
          >
            Todas
          </button>
          {routeCodes.map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={followed.includes(code)}
              onClick={() => toggleFollow(code)}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      <div className="live-map-wrap">
        <MapView className="live-map" label="Mapa en vivo de los recorridos">
          {visible.map((caravan) => {
            const geometry = geometryOf(caravan);
            return (
              geometry && (
                <RouteLayer
                  key={`line-${caravan.key}`}
                  geometry={geometry}
                  lineStyle={caravan.key === selectedKey ? "active" : "muted"}
                  showPoints={caravan.key === selectedKey}
                />
              )
            );
          })}
          {visible.map((caravan) => (
            <Marker
              key={caravan.key}
              position={caravan.location}
              icon={caravanIcon(
                caravan.routeCode,
                caravan.latestCode !== undefined &&
                  isEmergency(caravan.latestCode.code),
                caravan.key === selectedKey,
              )}
              title={`Recorrido ${caravan.routeCode} ${caravan.tripCode}`}
              alt={`Recorrido ${caravan.routeCode} ${caravan.tripCode}`}
              zIndexOffset={1000}
              eventHandlers={{ click: () => setSelectedKey(caravan.key) }}
            />
          ))}
          <FitBounds points={fitPoints} fitKey={fitKey} maxZoom={16} />
        </MapView>

        {live.data && caravans.length === 0 && (
          <div className="map-overlay live-empty">
            <p>No hay recorridos en curso en este momento.</p>
          </div>
        )}
        {!live.data && live.error && (
          <div className="map-overlay live-empty">
            <ErrorState message={live.error.message} onRetry={live.reload} />
          </div>
        )}
        {selected && (
          <CaravanPanel
            caravan={selected}
            onClose={() => setSelectedKey(null)}
          />
        )}
      </div>
    </div>
  );
}
