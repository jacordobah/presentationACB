import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import { listTripGeometries } from "../../api/routeGeometry";
import { getRoute } from "../../api/routes";
import {
  createStudent,
  listStudents,
  updateStudent,
} from "../../api/students";
import type {
  DocumentType,
  Route,
  SchoolShift,
  Student,
  StudentInput,
  TripCode,
  TripGeometry,
} from "../../api/types";
import { AsyncContent } from "../../components/AsyncContent";
import { Field } from "../../components/Field";
import { Notice } from "../../components/Notice";
import { EmptyState } from "../../components/States";
import { errorMessage, useToast } from "../../components/toast/ToastContext";
import { useResource } from "../../hooks/useResource";
import {
  DOCUMENT_TYPE_LABELS,
  SCHOOL_SHIFT_LABELS,
  TRIP_LABELS,
} from "../../lib/labels";

const GRADES = Array.from({ length: 11 }, (_, index) => String(index + 1));
const DOCUMENT_NUMBER = /^[A-Za-z0-9]{4,15}$/;
const PHONE = /^\d{10}$/;

type Errors = Record<string, string>;

function validate(input: StudentInput): Errors {
  const errors: Errors = {};
  if (!input.user.name.trim()) errors.name = "Escribe el nombre completo.";
  if (!DOCUMENT_NUMBER.test(input.user.documentNumber.trim())) {
    errors.documentNumber =
      "Escribe entre 4 y 15 letras o dígitos, sin espacios ni puntos.";
  }
  if (!input.user.address.trim()) errors.address = "Escribe la dirección.";
  if (!PHONE.test(input.user.phone.trim())) {
    errors.phone = "El teléfono debe tener 10 dígitos.";
  }
  if (!input.student.section.trim()) errors.section = "Escribe la sección.";
  for (const tripCode of ["541", "542"] as const) {
    if (!input.meetingPoints[tripCode])
      errors[`point${tripCode}`] = "Elige un punto.";
  }
  return errors;
}

function PointSelect({
  tripCode,
  geometry,
  value,
  error,
  onChange,
}: {
  tripCode: TripCode;
  geometry: TripGeometry | undefined;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const options =
    geometry?.meetingPoints.filter(
      (point) => tripCode === "541" || point.order > 1,
    ) ?? [];
  return (
    <Field
      label={`Punto de encuentro, ${TRIP_LABELS[tripCode].toLowerCase()} (${tripCode})`}
      hint={tripCode === "542" ? "Punto donde se baja de regreso." : undefined}
      error={error}
    >
      {(control) => (
        <select
          {...control}
          className="input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Elige un punto</option>
          {options.map((point) => (
            <option key={point.code} value={point.code}>
              {point.code} {point.name}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

function StudentForm({
  route,
  student,
  geometries,
}: {
  route: Route;
  student: Student | null;
  geometries: TripGeometry[];
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const editing = student !== null;
  const [fields, setFields] = useState({
    documentType: student?.documentType ?? ("NUIP" as DocumentType),
    documentNumber: student?.documentNumber ?? "",
    name: student?.name ?? "",
    address: student?.address ?? "",
    phone: student?.phone ?? "",
    grade: student?.grade ?? "6",
    schoolShift: student?.schoolShift ?? ("MORNING" as SchoolShift),
    section: student?.section ?? "A",
    meetingPoints: {
      "541": student?.meetingPoints["541"] ?? "",
      "542": student?.meetingPoints["542"] ?? "",
    } as Record<TripCode, string>,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const geometryFor = (tripCode: TripCode) =>
    geometries.find((geometry) => geometry.tripCode === tripCode);
  const backPath = `/guide/students?route=${route.routeCode}`;

  const setField = <K extends keyof typeof fields>(
    key: K,
    value: (typeof fields)[K],
  ) => setFields((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input: StudentInput = {
      user: {
        documentType: fields.documentType,
        documentNumber: fields.documentNumber.trim(),
        name: fields.name.trim(),
        address: fields.address.trim(),
        phone: fields.phone.trim(),
      },
      student: {
        grade: fields.grade,
        schoolShift: fields.schoolShift,
        section: fields.section.trim(),
        schoolId: route.schoolId,
      },
      meetingPoints: fields.meetingPoints,
    };
    const found = validate(input);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setServerError("Revisa los campos marcados.");
      return;
    }
    setSaving(true);
    setServerError(null);
    try {
      if (student) {
        await updateStudent(student.id, input.student, input.meetingPoints);
      } else {
        await createStudent(route.routeId, input);
      }
      toast.show("Estudiante guardado.", { tone: "success" });
      navigate(backPath);
    } catch (error) {
      setServerError(errorMessage(error));
      setSaving(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {serverError && <Notice tone="error">{serverError}</Notice>}

      {editing && (
        <Notice tone="info">
          Los datos personales no se pueden modificar desde este formulario.
        </Notice>
      )}

      <fieldset className="form-section">
        <legend>Datos del estudiante</legend>
        <div className="form-grid">
          <Field
            label="Nombre completo"
            error={errors.name}
            className="form-grid__full"
          >
            {(control) => (
              <input
                {...control}
                className="input"
                autoComplete="off"
                value={fields.name}
                disabled={editing}
                onChange={(event) => setField("name", event.target.value)}
              />
            )}
          </Field>
          <Field label="Tipo de documento">
            {(control) => (
              <select
                {...control}
                className="input"
                value={fields.documentType}
                disabled={editing}
                onChange={(event) =>
                  setField("documentType", event.target.value as DocumentType)
                }
              >
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {value} {label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Número de documento" error={errors.documentNumber}>
            {(control) => (
              <input
                {...control}
                className="input"
                autoComplete="off"
                value={fields.documentNumber}
                disabled={editing}
                onChange={(event) =>
                  setField("documentNumber", event.target.value)
                }
              />
            )}
          </Field>
          <Field
            label="Dirección"
            error={errors.address}
            className="form-grid__full"
          >
            {(control) => (
              <input
                {...control}
                className="input"
                autoComplete="off"
                value={fields.address}
                disabled={editing}
                onChange={(event) => setField("address", event.target.value)}
              />
            )}
          </Field>
          <Field label="Teléfono" error={errors.phone}>
            {(control) => (
              <input
                {...control}
                className="input"
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                value={fields.phone}
                disabled={editing}
                onChange={(event) => setField("phone", event.target.value)}
              />
            )}
          </Field>
          <Field label="Grado">
            {(control) => (
              <select
                {...control}
                className="input"
                value={fields.grade}
                onChange={(event) => setField("grade", event.target.value)}
              >
                {GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}°
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Jornada">
            {(control) => (
              <select
                {...control}
                className="input"
                value={fields.schoolShift}
                onChange={(event) =>
                  setField("schoolShift", event.target.value as SchoolShift)
                }
              >
                {Object.entries(SCHOOL_SHIFT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Sección" error={errors.section}>
            {(control) => (
              <input
                {...control}
                className="input"
                autoComplete="off"
                value={fields.section}
                onChange={(event) => setField("section", event.target.value)}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Puntos de encuentro</legend>
        <div className="form-grid">
          {(["541", "542"] as const).map((tripCode) => (
            <PointSelect
              key={tripCode}
              tripCode={tripCode}
              geometry={geometryFor(tripCode)}
              value={fields.meetingPoints[tripCode]}
              error={errors[`point${tripCode}`]}
              onChange={(value) =>
                setField("meetingPoints", {
                  ...fields.meetingPoints,
                  [tripCode]: value,
                })
              }
            />
          ))}
        </div>
      </fieldset>

      <div className="button-row">
        <Link className="button" to={backPath}>
          Cancelar
        </Link>
        <button
          type="submit"
          className="button button--primary button--large"
          disabled={saving}
        >
          {saving ? "Guardando…" : "Guardar estudiante"}
        </button>
      </div>
    </form>
  );
}

export default function StudentFormPage() {
  const { studentId } = useParams();
  const [searchParams] = useSearchParams();
  const routeIdParam = searchParams.get("routeId");
  const routeId = Number(routeIdParam);
  const editing = studentId !== undefined;
  const route = useResource(routeIdParam ? `route:${routeId}` : null, () =>
    getRoute(routeId),
  );
  const students = useResource(
    editing && routeIdParam ? `students:${routeId}` : null,
    () => listStudents(routeId),
  );
  const geometries = useResource(
    route.data ? `geometry:${route.data.routeCode}` : null,
    () =>
      listTripGeometries({ routeCode: route.data?.routeCode ?? "" }),
  );

  if (!routeIdParam) return <Navigate to="/guide/students" replace />;

  const student =
    students.data?.find((candidate) => candidate.id === Number(studentId)) ??
    null;

  return (
    <div className="page">
      <Link className="back-link" to="/guide/students">
        <ArrowLeft size={20} aria-hidden="true" />
        Estudiantes
      </Link>
      <header className="page-header">
        <h1>{editing ? "Editar estudiante" : "Agregar estudiante"}</h1>
      </header>
      <AsyncContent resource={route} loadingLabel="Cargando la ruta…">
        {(loadedRoute) => (
          <AsyncContent
            resource={geometries}
            loadingLabel="Cargando puntos de encuentro…"
          >
            {(tripGeometries) =>
              editing && students.data === undefined ? (
                <AsyncContent resource={students}>{() => null}</AsyncContent>
              ) : editing && !student ? (
                <EmptyState title="No encontramos este estudiante" />
              ) : (
                <StudentForm
                  key={student?.id ?? "new"}
                  route={loadedRoute}
                  student={student}
                  geometries={tripGeometries}
                />
              )
            }
          </AsyncContent>
        )}
      </AsyncContent>
    </div>
  );
}
