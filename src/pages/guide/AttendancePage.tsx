import { ClipboardCheck } from "lucide-react";
import { useSearchParams } from "react-router";
import { AsyncContent } from "../../components/AsyncContent";
import { RoutePicker } from "../../components/RoutePicker";
import { EmptyState } from "../../components/States";
import { useAssignedRoutes } from "../../hooks/useAssignedRoutes";
import { AttendanceHistory } from "../shared/AttendanceHistory";

export default function AttendancePage() {
  const routes = useAssignedRoutes();
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <div className="page">
      <header className="page-header">
        <h1>Asistencia</h1>
      </header>
      <AsyncContent
        resource={routes}
        loadingLabel="Cargando tus rutas…"
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            icon={ClipboardCheck}
            title="Aún no tienes rutas asignadas"
          />
        }
      >
        {(list) => {
          const selected =
            list.find((route) => route.code === searchParams.get("route")) ??
            list[0];
          return (
            <>
              <RoutePicker
                routes={list}
                selected={selected.code}
                onSelect={(code) =>
                  setSearchParams({ route: code }, { replace: true })
                }
              />
              <section className="section" aria-labelledby="attendance-title">
                <h2 id="attendance-title">Ruta {selected.code}</h2>
                <AttendanceHistory
                  key={selected.code}
                  routeCode={selected.code}
                />
              </section>
            </>
          );
        }}
      </AsyncContent>
    </div>
  );
}
