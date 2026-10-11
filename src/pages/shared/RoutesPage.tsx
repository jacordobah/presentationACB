import { Route as RouteIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { listRoutes } from "../../api/routes";
import type { RouteStatus } from "../../api/types";
import { listZones } from "../../api/zones";
import { useSessionUser } from "../../auth/AuthContext";
import { AsyncContent } from "../../components/AsyncContent";
import { RouteStatusChip } from "../../components/Chips";
import { Field } from "../../components/Field";
import { EmptyState } from "../../components/States";
import { useResource } from "../../hooks/useResource";
import { ROUTE_STATUS_LABELS, plural } from "../../lib/labels";
import { requiredGuides } from "../../lib/rules";

export default function RoutesPage() {
  const user = useSessionUser();
  const isManager = user.role === "MANAGER";
  const basePath = isManager ? "/manager" : "/leader";
  const [zone, setZone] = useState("");
  const [status, setStatus] = useState<RouteStatus | "">("");
  const zones = useResource(isManager ? "zones" : null, listZones);
  const routes = useResource(`routes:${zone}:${status}`, async () =>
    (await listRoutes({ zone: zone || null, status: status || null })).filter(
      (route) => route.active,
    ),
  );

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header__title">
          <h1>Rutas</h1>
          {!isManager && (
            <p className="page-header__subtitle">Zona {user.zone}</p>
          )}
        </div>
      </header>
      <div className="form-grid">
        {isManager && (
          <Field label="Zona">
            {(control) => (
              <select
                {...control}
                className="input"
                value={zone}
                onChange={(event) => setZone(event.target.value)}
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
        <Field label="Estado">
          {(control) => (
            <select
              {...control}
              className="input"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as RouteStatus | "")
              }
            >
              <option value="">Todos los estados</option>
              {Object.entries(ROUTE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <AsyncContent
        resource={routes}
        loadingLabel="Cargando rutas…"
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState icon={RouteIcon} title="No hay rutas con esos filtros" />
        }
      >
        {(list) => (
          <ul className="list">
            {list.map((route) => {
              const required = requiredGuides(route.studentCount);
              return (
                <li key={route.code} className="list-row">
                  <div className="list-row__top">
                    <div className="list-row__title">
                      <span className="route-code">{route.code}</span>
                      <span>{route.schoolName}</span>
                    </div>
                    <RouteStatusChip status={route.status} />
                  </div>
                  <dl className="facts">
                    <div>
                      <dt>Estudiantes</dt>
                      <dd>{route.studentCount}</dd>
                    </div>
                    <div>
                      <dt>Guías</dt>
                      <dd>
                        {route.guides.length} de {required}
                      </dd>
                    </div>
                  </dl>
                  {route.guides.length < required && (
                    <span className="chip chip--late">
                      Le{" "}
                      {required - route.guides.length === 1
                        ? "falta"
                        : "faltan"}{" "}
                      {plural(required - route.guides.length, "guía", "guías")}
                    </span>
                  )}
                  <Link
                    className="button"
                    to={`${basePath}/routes/${route.code}`}
                  >
                    Ver ruta {route.code}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </AsyncContent>
    </div>
  );
}
