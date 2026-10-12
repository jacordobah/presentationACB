import { Inbox } from "lucide-react";
import { Link } from "react-router";
import { listRoutes } from "../../api/routes";
import { AsyncContent } from "../../components/AsyncContent";
import { EmptyState } from "../../components/States";
import { useResource } from "../../hooks/useResource";
import { LIST_POLL_MS } from "../../lib/config";

export default function RequestsPage() {
  const requests = useResource(
    "routes:in-review",
    () => listRoutes({ status: "IN_REVIEW" }),
    { pollMs: LIST_POLL_MS },
  );

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header__title">
          <h1>Solicitudes</h1>
          <p className="page-header__subtitle">
            Rutas propuestas que esperan tu revisión.
          </p>
        </div>
      </header>
      <AsyncContent
        resource={requests}
        loadingLabel="Cargando solicitudes…"
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState icon={Inbox} title="No hay rutas por revisar">
            Cuando un guía envíe una ruta a revisión, aparecerá aquí para que puedas
            aprobarla o rechazarla.
          </EmptyState>
        }
      >
        {(list) => (
          <ul className="list">
            {list.map((route) => (
              <li key={route.code} className="list-row">
                <div className="list-row__title">
                  <span className="route-code">{route.code}</span>
                  <span>{route.schoolName}</span>
                </div>
                <dl className="facts">
                  <div>
                    <dt>Propuesta por</dt>
                    <dd>{route.proposedBy.name}</dd>
                  </div>
                  <div>
                    <dt>Zona</dt>
                    <dd>{route.zone}</dd>
                  </div>
                </dl>
                <p className="muted">{route.description}</p>
                <Link
                  className="button button--primary"
                  to={`/manager/requests/${route.code}`}
                >
                  Revisar ruta {route.code}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AsyncContent>
    </div>
  );
}
