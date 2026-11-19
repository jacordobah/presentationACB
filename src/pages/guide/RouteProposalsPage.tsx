import { Plus, Route as RouteIcon } from "lucide-react";
import { Link } from "react-router";
import { listRoutes } from "../../api/routes";
import { AsyncContent } from "../../components/AsyncContent";
import { EmptyState } from "../../components/States";
import { useAssignedRoutes } from "../../hooks/useAssignedRoutes";
import { useResource } from "../../hooks/useResource";

export default function RouteProposalsPage() {
  const assigned = useAssignedRoutes();
  const routes = useResource("routes:guide", async () => {
    const list = await listRoutes();
    return list.filter((route) => route.active);
  });

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header__title">
          <h1>Rutas</h1>
          <p className="page-header__subtitle">
            Tus rutas asignadas y las rutas activas de la operación.
          </p>
        </div>
        <Link className="button button--primary" to="/guide/routes/new">
          <Plus size={20} aria-hidden="true" />
          Proponer ruta
        </Link>
      </header>
      <AsyncContent
        resource={routes}
        loadingLabel="Cargando rutas…"
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState icon={RouteIcon} title="Todavía no tienes rutas">
            Propón una ruta con su KMZ para que el gerente la revise.
          </EmptyState>
        }
      >
        {(list) => {
          const mine = new Set(
            (assigned.data ?? []).map((route) => route.routeId),
          );
          return (
            <ul className="list">
              {list.map((route) => (
                <li key={route.routeId} className="list-row">
                  <div className="list-row__top">
                    <div className="list-row__title">
                      <span className="route-code">{route.routeCode}</span>
                      <span>{route.schoolName}</span>
                    </div>
                    {mine.has(route.routeId) && (
                      <span className="chip chip--done">Asignada</span>
                    )}
                  </div>
                  <p className="muted">{route.description}</p>
                  <Link
                    className="button"
                    to={`/guide/routes/${route.routeId}`}
                  >
                    Editar ruta
                  </Link>
                </li>
              ))}
            </ul>
          );
        }}
      </AsyncContent>
    </div>
  );
}
