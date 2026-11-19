import { Route as RouteIcon } from "lucide-react";
import { Link } from "react-router";
import { listRoutes } from "../../api/routes";
import { AsyncContent } from "../../components/AsyncContent";
import { EmptyState } from "../../components/States";
import { useResource } from "../../hooks/useResource";
import { LIST_POLL_MS } from "../../lib/config";

export default function RequestsPage() {
  const routes = useResource(
    "routes:active",
    async () => (await listRoutes()).filter((route) => route.active),
    { pollMs: LIST_POLL_MS },
  );

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header__title">
          <h1>Rutas</h1>
          <p className="page-header__subtitle">
            Rutas activas disponibles para la operación.
          </p>
        </div>
      </header>
      <AsyncContent
        resource={routes}
        loadingLabel="Cargando rutas…"
        isEmpty={(list) => list.length === 0}
        empty={<EmptyState icon={RouteIcon} title="No hay rutas activas" />}
      >
        {(list) => (
          <ul className="list">
            {list.map((route) => (
              <li key={route.routeId} className="list-row">
                <div className="list-row__title">
                  <span className="route-code">{route.routeCode}</span>
                  <span>{route.schoolName}</span>
                </div>
                <dl className="facts">
                  <div>
                    <dt>Zona</dt>
                    <dd>{route.zone ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Jornada</dt>
                    <dd>{route.shiftCode}</dd>
                  </div>
                </dl>
                <p className="muted">{route.description}</p>
                <Link
                  className="button button--primary"
                  to={`/manager/routes/${route.routeId}`}
                >
                  Ver ruta {route.routeCode}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AsyncContent>
    </div>
  );
}
