import { Navigate, useParams } from "react-router";

// El flujo de propuestas y aprobación no tiene contrato en adminACB. La ruta
// se administra directamente desde el detalle de ruta.
export default function RequestDetailPage() {
  const { routeId = "" } = useParams();
  return <Navigate to={`/manager/routes/${routeId}`} replace />;
}
