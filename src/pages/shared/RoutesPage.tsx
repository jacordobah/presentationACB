import { Route as RouteIcon } from "lucide-react";
import { Link } from "react-router";
import { listRoutes } from "../../api/routes";
import { useSessionUser } from "../../auth/AuthContext";
import { AsyncContent } from "../../components/AsyncContent";
import { EmptyState } from "../../components/States";
import { useResource } from "../../hooks/useResource";
import { plural } from "../../lib/labels";
import { requiredGuides } from "../../lib/rules";

export default function RoutesPage() {
  const user = useSessionUser();
  const basePath = user.role === "MANAGER" ? "/manager" : "/leader";
  const routes = useResource("routes", async () =>
    (await listRoutes()).filter((route) => route.active),
  );

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header__title">
          <h1>Rutas</h1>
          {user.role !== "MANAGER" && (
            <p className="page-header__subtitle">Zona {user.zone}</p>
          )}
        </div>
      </header>
      <AsyncContent
        resource={routes}
        loadingLabel="Cargando rutas…"
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState icon={RouteIcon} title="No hay rutas activas" />
        }
      >
        {(list) => (
          <ul className="list">
            {list.map((route) => {
              const required = requiredGuides(route.studentCount);
              return (
                <li key={route.routeId} className="list-row">
                  <div className="list-row__top">
                    <div className="list-row__title">
                      <span className="route-code">{route.routeCode}</span>
                      <span>{route.schoolName}</span>
                    </div>
                    <span className="chip">{route.shiftCode}</span>
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
                    to={`${basePath}/routes/${route.routeId}`}
                  >
                    Ver ruta {route.routeCode}
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
