import { Plus, Route as RouteIcon } from "lucide-react";
import { Link } from "react-router";
import { listRoutes } from "../../api/routes";
import { AsyncContent } from "../../components/AsyncContent";
import { RouteStatusChip } from "../../components/Chips";
import { Notice } from "../../components/Notice";
import { EmptyState } from "../../components/States";
import { useResource } from "../../hooks/useResource";

export default function RouteProposalsPage() {
  const routes = useResource("routes:proposals", async () =>
    (await listRoutes()).filter((route) => route.active),
  );

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header__title">
          <h1>Proponer ruta</h1>
          <p className="page-header__subtitle">
            Tus rutas asignadas y las que propusiste, con su estado de
            aprobación.
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
        {(list) => (
          <ul className="list">
            {list.map((route) => (
              <li key={route.code} className="list-row">
                <div className="list-row__top">
                  <div className="list-row__title">
                    <span className="route-code">{route.code}</span>
                    <span>{route.schoolName}</span>
                  </div>
                  <RouteStatusChip status={route.status} />
                </div>
                <p className="muted">{route.description}</p>
                {route.status === "REJECTED" && route.reviewNotes && (
                  <Notice tone="warning" title="Observaciones de la revisión">
                    {route.reviewNotes}
                  </Notice>
                )}
                <Link className="button" to={`/guide/routes/${route.code}`}>
                  {route.status === "IN_REVIEW" ? "Ver ruta" : "Editar ruta"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AsyncContent>
    </div>
  );
}
