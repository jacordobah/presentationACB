import { Phone, Users } from "lucide-react";
import { useSearchParams } from "react-router";
import { listTripGeometries } from "../../api/routeGeometry";
import { listStudents } from "../../api/students";
import type { Route, Student, TripCode, TripGeometry } from "../../api/types";
import { AsyncContent } from "../../components/AsyncContent";
import { RoutePicker } from "../../components/RoutePicker";
import { EmptyState } from "../../components/States";
import { useAssignedRoutes } from "../../hooks/useAssignedRoutes";
import { useResource } from "../../hooks/useResource";
import { TRIP_LABELS } from "../../lib/labels";

function pointName(
  geometries: TripGeometry[] | undefined,
  tripCode: TripCode,
  code: string | null,
) {
  if (!code) return "—";
  const point = geometries
    ?.find((geometry) => geometry.tripCode === tripCode)
    ?.meetingPoints.find((candidate) => candidate.code === code);
  return point ? `${code} ${point.name}` : code;
}

function StudentRow({
  student,
  geometries,
}: {
  student: Student;
  geometries: TripGeometry[] | undefined;
}) {
  const guardian =
    student.guardians.find((candidate) => candidate.primary) ??
    student.guardians[0];
  return (
    <li className="list-row">
      <div className="list-row__top">
        <strong>{student.name}</strong>
        <span className="chip">Grado {student.grade}</span>
      </div>
      <dl className="facts">
        {(["541", "542"] as const).map((tripCode) => (
          <div key={tripCode}>
            <dt>{TRIP_LABELS[tripCode]}</dt>
            <dd>
              {pointName(geometries, tripCode, student.meetingPoints[tripCode])}
            </dd>
          </div>
        ))}
        {guardian && (
          <div>
            <dt>Acudiente principal</dt>
            <dd>{guardian.name}</dd>
          </div>
        )}
      </dl>
      {guardian?.phone && (
        <a className="button" href={`tel:${guardian.phone}`}>
          <Phone size={20} aria-hidden="true" />
          Llamar al acudiente
        </a>
      )}
    </li>
  );
}

function RouteStudents({ route }: { route: Route }) {
  const students = useResource(`students:${route.routeId}`, () =>
    listStudents(route.routeId),
  );
  const geometries = useResource(`geometry:${route.routeCode}`, () =>
    listTripGeometries({ routeCode: route.routeCode }),
  );

  return (
    <AsyncContent resource={students} loadingLabel="Cargando estudiantes…">
      {(list) => {
        const active = list
          .filter((student) => student.active)
          .toSorted((a, b) => a.name.localeCompare(b.name));
        return (
          <section className="section" aria-labelledby="students-title">
            <div className="section__header">
              <h2 id="students-title">Ruta {route.routeCode}</h2>
              <span className="chip">{active.length} estudiantes</span>
            </div>
            {active.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Esta ruta todavía no tiene estudiantes"
              />
            ) : (
              <ul className="list">
                {active.map((student) => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    geometries={geometries.data}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      }}
    </AsyncContent>
  );
}

export default function StudentsPage() {
  const routes = useAssignedRoutes();
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <div className="page">
      <header className="page-header">
        <h1>Estudiantes</h1>
      </header>
      <AsyncContent
        resource={routes}
        loadingLabel="Cargando tus rutas…"
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState icon={Users} title="Aún no tienes rutas asignadas">
            Cuando tu líder zonal te asigne una ruta, aquí verás sus
            estudiantes.
          </EmptyState>
        }
      >
        {(list) => {
          const selected =
            list.find(
              (route) => route.routeCode === searchParams.get("route"),
            ) ?? list[0];
          return (
            <>
              <RoutePicker
                routes={list}
                selected={selected.routeCode}
                onSelect={(routeCode) =>
                  setSearchParams({ route: routeCode }, { replace: true })
                }
              />
              <RouteStudents key={selected.routeId} route={selected} />
            </>
          );
        }}
      </AsyncContent>
    </div>
  );
}
