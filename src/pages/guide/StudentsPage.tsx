import { Pencil, Phone, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { listTripGeometries } from "../../api/routeGeometry";
import { deactivateStudent, listStudents } from "../../api/students";
import type { Route, Student, TripCode, TripGeometry } from "../../api/types";
import { AsyncContent } from "../../components/AsyncContent";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Notice } from "../../components/Notice";
import { RoutePicker } from "../../components/RoutePicker";
import { EmptyState } from "../../components/States";
import { errorMessage, useToast } from "../../components/toast/ToastContext";
import { useAssignedRoutes } from "../../hooks/useAssignedRoutes";
import { useResource } from "../../hooks/useResource";
import { TRIP_LABELS } from "../../lib/labels";
import { MAX_STUDENTS } from "../../lib/rules";

function pointName(
  geometries: TripGeometry[] | undefined,
  tripCode: TripCode,
  code: string,
) {
  const point = geometries
    ?.find((geometry) => geometry.tripCode === tripCode)
    ?.meetingPoints.find((candidate) => candidate.code === code);
  return point ? `${code} ${point.name}` : code;
}

function StudentRow({
  student,
  geometries,
  onDeactivate,
}: {
  student: Student;
  geometries: TripGeometry[] | undefined;
  onDeactivate: () => void;
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
      <div className="cluster">
        {guardian && (
          <a className="button" href={`tel:${guardian.phone}`}>
            <Phone size={20} aria-hidden="true" />
            Llamar al acudiente
          </a>
        )}
        <Link
          className="button"
          to={`/guide/students/${student.id}?route=${student.routeCode}`}
        >
          <Pencil size={20} aria-hidden="true" />
          Editar
        </Link>
        <button
          type="button"
          className="button button--quiet"
          onClick={onDeactivate}
        >
          Desactivar
        </button>
      </div>
    </li>
  );
}

function RouteStudents({ route }: { route: Route }) {
  const navigate = useNavigate();
  const toast = useToast();
  const students = useResource(`students:${route.code}`, () =>
    listStudents(route.code),
  );
  const geometries = useResource(`geometry:${route.code}`, () =>
    listTripGeometries({ routeCode: route.code }),
  );
  const [deactivating, setDeactivating] = useState<Student | null>(null);
  const [busy, setBusy] = useState(false);

  const confirmDeactivate = async () => {
    if (!deactivating) return;
    setBusy(true);
    try {
      await deactivateStudent(deactivating.id);
      toast.show(`${deactivating.name} quedó desactivado.`, {
        tone: "success",
      });
      setDeactivating(null);
      students.reload();
    } catch (error) {
      toast.show(errorMessage(error), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AsyncContent resource={students} loadingLabel="Cargando estudiantes…">
      {(list) => {
        const active = list
          .filter((student) => student.active)
          .toSorted((a, b) => a.name.localeCompare(b.name));
        const full = active.length >= MAX_STUDENTS;
        return (
          <section className="section" aria-labelledby="students-title">
            <div className="section__header">
              <h2 id="students-title">Ruta {route.code}</h2>
              <button
                type="button"
                className="button button--primary"
                disabled={full}
                onClick={() =>
                  navigate(`/guide/students/new?route=${route.code}`)
                }
              >
                <UserPlus size={20} aria-hidden="true" />
                Agregar estudiante
              </button>
            </div>
            <div className="capacity">
              <span>
                <strong>
                  {active.length} de {MAX_STUDENTS}
                </strong>{" "}
                estudiantes inscritos
              </span>
              <div className="meter" aria-hidden="true">
                <span
                  style={{ width: `${(active.length / MAX_STUDENTS) * 100}%` }}
                />
              </div>
            </div>
            {full && (
              <Notice tone="warning">
                La ruta llegó al máximo de {MAX_STUDENTS} estudiantes. Desactiva
                a alguien para inscribir a otra persona.
              </Notice>
            )}
            {active.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Esta ruta todavía no tiene estudiantes"
              >
                Agrega estudiantes para que aparezcan en la lista de asistencia.
              </EmptyState>
            ) : (
              <ul className="list">
                {active.map((student) => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    geometries={geometries.data}
                    onDeactivate={() => setDeactivating(student)}
                  />
                ))}
              </ul>
            )}
            <ConfirmDialog
              open={deactivating !== null}
              title={`¿Desactivar a ${deactivating?.name ?? ""}?`}
              confirmLabel="Desactivar estudiante"
              danger
              busy={busy}
              onConfirm={confirmDeactivate}
              onCancel={() => setDeactivating(null)}
            >
              <p>
                Deja de aparecer en la asistencia de la ruta {route.code}. Su
                historial se conserva.
              </p>
            </ConfirmDialog>
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
              <RouteStudents key={selected.code} route={selected} />
            </>
          );
        }}
      </AsyncContent>
    </div>
  );
}
