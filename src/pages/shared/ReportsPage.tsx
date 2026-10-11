import { Bell, MapPin } from "lucide-react";
import { useRef, useState } from "react";
import { Marker, Tooltip } from "react-leaflet";
import { listCodeReports } from "../../api/codes";
import { listRoutes } from "../../api/routes";
import type { CodeReport, OperationalCode } from "../../api/types";
import { listZones } from "../../api/zones";
import { useSessionUser } from "../../auth/AuthContext";
import { AsyncContent } from "../../components/AsyncContent";
import { AuthorizedImage } from "../../components/AuthorizedImage";
import { CodeChip } from "../../components/Chips";
import { Field } from "../../components/Field";
import { FitBounds, FlyTo } from "../../components/map/FitBounds";
import { MapView } from "../../components/map/MapView";
import { reportIcon } from "../../components/map/markers";
import { Sheet } from "../../components/Sheet";
import { EmptyState } from "../../components/States";
import { useResource } from "../../hooks/useResource";
import { ALL_CODES, CODES, isEmergency } from "../../lib/codes";
import { LIST_POLL_MS } from "../../lib/config";
import { formatTime, todayInBogota } from "../../lib/dates";
import { TRIP_LABELS } from "../../lib/labels";
import "./ReportsPage.css";

function ReportItem({
  report,
  focused,
  onLocate,
  onOpenPhoto,
}: {
  report: CodeReport;
  focused: boolean;
  onLocate: () => void;
  onOpenPhoto: () => void;
}) {
  const emergency = isEmergency(report.code);
  return (
    <li
      className={`list-row report-item${emergency ? " list-row--emergency" : ""}${focused ? " report-item--focused" : ""}`}
    >
      <div className="list-row__top">
        <div className="list-row__title">
          <CodeChip code={report.code} />
          <strong>{CODES[report.code].label}</strong>
        </div>
        <time dateTime={report.notifiedAt} className="report-item__time">
          {formatTime(report.notifiedAt)}
        </time>
      </div>
      <dl className="facts">
        <div>
          <dt>Guía</dt>
          <dd>{report.userName ?? "Sin nombre"}</dd>
        </div>
        <div>
          <dt>Ruta</dt>
          <dd>
            {report.routeCode} {report.tripCode}{" "}
            {TRIP_LABELS[report.tripCode].toLowerCase()}
          </dd>
        </div>
      </dl>
      {report.detail && <p>{report.detail}</p>}
      <div className="report-item__actions">
        <button type="button" className="button" onClick={onLocate}>
          <MapPin size={20} aria-hidden="true" />
          Ver en el mapa
        </button>
        {report.photoUrl && (
          <button
            type="button"
            className="report-item__thumb"
            onClick={onOpenPhoto}
            aria-label={`Ver foto del código ${report.code}`}
          >
            <AuthorizedImage
              src={report.photoUrl}
              alt=""
              className="report-item__image"
            />
          </button>
        )}
      </div>
    </li>
  );
}

export default function ReportsPage() {
  const user = useSessionUser();
  const isManager = user.role === "MANAGER";
  const today = todayInBogota();
  const [date, setDate] = useState(today);
  const [zone, setZone] = useState("");
  const [routeCode, setRouteCode] = useState("");
  const [code, setCode] = useState<OperationalCode | "">("");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [locateCount, setLocateCount] = useState(0);
  const [photoReport, setPhotoReport] = useState<CodeReport | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const zoneFilter = isManager ? zone || null : user.zone;

  const zones = useResource(isManager ? "zones" : null, listZones);
  const routes = useResource(`routes:${zoneFilter ?? "all"}`, () =>
    listRoutes({ zone: zoneFilter }),
  );
  const reports = useResource(
    `reports:${date}:${zoneFilter ?? "all"}:${routeCode}`,
    () =>
      listCodeReports({ date, zone: zoneFilter, routeCode: routeCode || null }),
    { pollMs: date === today ? LIST_POLL_MS : undefined },
  );
  const filtered = (reports.data ?? []).filter(
    (report) => !code || report.code === code,
  );
  const focused = filtered.find((report) => report.id === focusedId) ?? null;

  const locate = (report: CodeReport) => {
    setFocusedId(report.id);
    setLocateCount((count) => count + 1);
    mapRef.current?.scrollIntoView({ block: "nearest" });
  };

  return (
    <div className="page page--wide">
      <header className="page-header">
        <div className="page-header__title">
          <h1>Novedades</h1>
          <p className="page-header__subtitle">
            Códigos reportados{" "}
            {isManager ? "en todas las zonas" : `en la zona ${user.zone}`}.
          </p>
        </div>
      </header>

      <div className="filters">
        <Field label="Fecha">
          {(control) => (
            <input
              {...control}
              className="input"
              type="date"
              value={date}
              max={today}
              onChange={(event) => setDate(event.target.value || today)}
            />
          )}
        </Field>
        {isManager && (
          <Field label="Zona">
            {(control) => (
              <select
                {...control}
                className="input"
                value={zone}
                onChange={(event) => {
                  setZone(event.target.value);
                  setRouteCode("");
                }}
              >
                <option value="">Todas las zonas</option>
                {zones.data?.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
        <Field label="Ruta">
          {(control) => (
            <select
              {...control}
              className="input"
              value={routeCode}
              onChange={(event) => setRouteCode(event.target.value)}
            >
              <option value="">Todas las rutas</option>
              {routes.data?.map((route) => (
                <option key={route.code} value={route.code}>
                  {route.code}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Código">
          {(control) => (
            <select
              {...control}
              className="input"
              value={code}
              onChange={(event) =>
                setCode(event.target.value as OperationalCode | "")
              }
            >
              <option value="">Todos los códigos</option>
              {ALL_CODES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} {option.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <div className="reports-layout">
        <div className="reports-map" ref={mapRef}>
          <MapView className="reports-map__view" label="Mapa de las novedades">
            {filtered.map((report) => (
              <Marker
                key={report.id}
                position={report.location}
                icon={reportIcon(
                  report.code,
                  isEmergency(report.code),
                  report.id === focusedId,
                )}
                eventHandlers={{ click: () => setFocusedId(report.id) }}
                zIndexOffset={report.id === focusedId ? 1000 : 0}
              >
                <Tooltip>
                  {report.code} {report.routeCode}{" "}
                  {formatTime(report.notifiedAt)}
                </Tooltip>
              </Marker>
            ))}
            <FitBounds
              points={filtered.map((report) => report.location)}
              fitKey={`${date}:${zoneFilter}:${routeCode}:${code}:${filtered.length > 0}`}
            />
            {locateCount > 0 && (
              <FlyTo
                point={focused?.location ?? null}
                flyKey={String(locateCount)}
              />
            )}
          </MapView>
        </div>

        <AsyncContent
          resource={reports}
          loadingLabel="Cargando novedades…"
          isEmpty={() => filtered.length === 0}
          empty={
            <EmptyState icon={Bell} title="No hay códigos con esos filtros" />
          }
        >
          {() => (
            <ul className="list reports-list">
              {filtered.map((report) => (
                <ReportItem
                  key={report.id}
                  report={report}
                  focused={report.id === focusedId}
                  onLocate={() => locate(report)}
                  onOpenPhoto={() => setPhotoReport(report)}
                />
              ))}
            </ul>
          )}
        </AsyncContent>
      </div>

      <Sheet
        open={photoReport !== null}
        title={photoReport ? `Foto del código ${photoReport.code}` : "Foto"}
        onClose={() => setPhotoReport(null)}
        variant="dialog"
      >
        {photoReport?.photoUrl && (
          <AuthorizedImage
            src={photoReport.photoUrl}
            alt={`Foto enviada por ${photoReport.userName ?? "el guía"} con el código ${photoReport.code}`}
            className="photo-full"
          />
        )}
      </Sheet>
    </div>
  );
}
