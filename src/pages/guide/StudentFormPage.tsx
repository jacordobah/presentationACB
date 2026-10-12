import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import { listTripGeometries } from "../../api/routeGeometry";
import { createStudent, listStudents, updateStudent } from "../../api/students";
import type {
  DocumentType,
  Guardian,
  Relationship,
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
  RELATIONSHIP_LABELS,
  SCHOOL_SHIFT_LABELS,
  TRIP_LABELS,
} from "../../lib/labels";

const GRADES = Array.from({ length: 11 }, (_, i) => String(i + 1));
const MAX_GUARDIANS = 3;
const DOCUMENT_NUMBER = /^[A-Za-z0-9]{4,15}$/;
const PHONE = /^\d{10}$/;

type Errors = Record<string, string>;

const emptyGuardian = (primary: boolean): Guardian => ({
  name: "",
  documentType: "CC",
  documentNumber: "",
  phone: "",
  relationship: "MOTHER",
  primary,
});

function Select({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Record<string, string>;
  error?: string;
}) {
  return (
    <Field label={label} error={error}>
      {(control) => (
        <select
          {...control}
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {Object.entries(options).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

function validate(student: StudentInput): Errors {
  const errors: Errors = {};
  if (!student.name.trim()) errors.name = "Escribe el nombre completo.";
  if (!DOCUMENT_NUMBER.test(student.documentNumber.trim())) {
    errors.documentNumber =
      "Escribe entre 4 y 15 letras o dígitos, sin espacios ni puntos.";
  }
  if (!student.address.trim()) errors.address = "Escribe la dirección.";
  for (const tripCode of ["541", "542"] as const) {
    if (!student.meetingPoints[tripCode])
      errors[`point${tripCode}`] = "Elige un punto.";
  }
  student.guardians.forEach((guardian, index) => {
    if (!guardian.name.trim())
      errors[`guardian${index}.name`] = "Escribe el nombre.";
    if (!DOCUMENT_NUMBER.test(guardian.documentNumber.trim())) {
      errors[`guardian${index}.documentNumber`] =
        "Escribe entre 4 y 15 letras o dígitos.";
    }
    if (!PHONE.test(guardian.phone.trim())) {
      errors[`guardian${index}.phone`] = "El teléfono debe tener 10 dígitos.";
    }
  });
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
  // In 542 everyone boards at the school (PE01), so only the drop-off points
  // can be chosen.
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

function GuardianFields({
  index,
  guardian,
  errors,
  canRemove,
  onChange,
  onMakePrimary,
  onRemove,
}: {
  index: number;
  guardian: Guardian;
  errors: Errors;
  canRemove: boolean;
  onChange: (index: number, guardian: Guardian) => void;
  onMakePrimary: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const update = (change: Partial<Guardian>) =>
    onChange(index, { ...guardian, ...change });
  const error = (field: string) => errors[`guardian${index}.${field}`];

  return (
    <fieldset className="guardian">
      <legend className="guardian__legend">Acudiente {index + 1}</legend>
      <label className="checkbox">
        <input
          type="radio"
          name="primary-guardian"
          checked={guardian.primary}
          onChange={() => onMakePrimary(index)}
        />
        Acudiente principal
      </label>
      <div className="form-grid">
        <Field
          label="Nombre completo"
          error={error("name")}
          className="form-grid__full"
        >
          {(control) => (
            <input
              {...control}
              className="input"
              value={guardian.name}
              onChange={(event) => update({ name: event.target.value })}
            />
          )}
        </Field>
        <Select
          label="Parentesco"
          value={guardian.relationship}
          onChange={(v) => update({ relationship: v as Relationship })}
          options={RELATIONSHIP_LABELS}
        />
        <Field label="Teléfono" error={error("phone")}>
          {(control) => (
            <input
              {...control}
              className="input"
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              value={guardian.phone}
              onChange={(event) => update({ phone: event.target.value.trim() })}
            />
          )}
        </Field>
        <Select
          label="Tipo de documento"
          value={guardian.documentType}
          onChange={(v) => update({ documentType: v as DocumentType })}
          options={Object.fromEntries(
            Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => [k, `${k} ${v}`]),
          )}
        />
        <Field label="Número de documento" error={error("documentNumber")}>
          {(control) => (
            <input
              {...control}
              className="input"
              value={guardian.documentNumber}
              onChange={(event) =>
                update({ documentNumber: event.target.value.trim() })
              }
            />
          )}
        </Field>
      </div>
      {canRemove && (
        <button
          type="button"
          className="button button--quiet"
          onClick={() => onRemove(index)}
        >
          <Trash2 size={20} aria-hidden="true" />
          Quitar acudiente {index + 1}
        </button>
      )}
    </fieldset>
  );
}

function StudentForm({
  routeCode,
  student,
  geometries,
}: {
  routeCode: string;
  student: Student | null;
  geometries: TripGeometry[];
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const [fields, setFields] = useState({
    documentType: student?.documentType ?? ("NUIP" as DocumentType),
    documentNumber: student?.documentNumber ?? "",
    name: student?.name ?? "",
    address: student?.address ?? "",
    grade: student?.grade ?? "6",
    schoolShift: student?.schoolShift ?? ("MORNING" as SchoolShift),
    meetingPoints: student?.meetingPoints ?? { "541": "", "542": "" },
  });
  const [guardians, setGuardians] = useState<Guardian[]>(
    student?.guardians ?? [emptyGuardian(true)],
  );
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const geometryFor = (tripCode: TripCode) =>
    geometries.find((geometry) => geometry.tripCode === tripCode);
  const backPath = `/guide/students?route=${routeCode}`;

  const setField = <K extends keyof typeof fields>(
    key: K,
    value: (typeof fields)[K],
  ) => setFields((current) => ({ ...current, [key]: value }));

  const updateGuardian = (index: number, value: Guardian) =>
    setGuardians((current) =>
      current.map((guardian, i) => (i === index ? value : guardian)),
    );

  const makePrimary = (index: number) =>
    setGuardians((current) =>
      current.map((guardian, i) => ({
        ...guardian,
        primary: i === index,
      })),
    );

  const removeGuardian = (index: number) =>
    setGuardians((current) => {
      const remaining = current.filter((_, i) => i !== index);
      if (remaining.some((guardian) => guardian.primary)) return remaining;
      return remaining.map((guardian, i) => ({
        ...guardian,
        primary: i === 0,
      }));
    });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input: StudentInput = {
      ...fields,
      documentNumber: fields.documentNumber.trim(),
      name: fields.name.trim(),
      address: fields.address.trim(),
      routeCode,
      guardians: guardians.map((guardian) => ({
        ...guardian,
        name: guardian.name.trim(),
      })),
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
      if (student) await updateStudent(student.id, input);
      else await createStudent(input);
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
                onChange={(event) => setField("name", event.target.value)}
              />
            )}
          </Field>
          <Select
            label="Tipo de documento"
            value={fields.documentType}
            onChange={(v) => setField("documentType", v as DocumentType)}
            options={Object.fromEntries(
              Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => [k, `${k} ${v}`]),
            )}
          />
          <Field label="Número de documento" error={errors.documentNumber}>
            {(control) => (
              <input
                {...control}
                className="input"
                autoComplete="off"
                value={fields.documentNumber}
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
                onChange={(event) => setField("address", event.target.value)}
              />
            )}
          </Field>
          <Select
            label="Grado"
            value={fields.grade}
            onChange={(v) => setField("grade", v)}
            options={Object.fromEntries(GRADES.map((g) => [g, `${g}°`]))}
          />
          <Select
            label="Jornada"
            value={fields.schoolShift}
            onChange={(v) => setField("schoolShift", v as SchoolShift)}
            options={SCHOOL_SHIFT_LABELS}
          />
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

      <fieldset className="form-section">
        <legend>Acudientes</legend>
        <p className="muted small">
          Registra entre 1 y 3 acudientes y marca uno como principal.
        </p>
        {guardians.map((guardian, index) => (
          <GuardianFields
            key={index}
            index={index}
            guardian={guardian}
            errors={errors}
            canRemove={guardians.length > 1}
            onChange={updateGuardian}
            onMakePrimary={makePrimary}
            onRemove={removeGuardian}
          />
        ))}
        {guardians.length < MAX_GUARDIANS && (
          <button
            type="button"
            className="button"
            onClick={() =>
              setGuardians((current) => [...current, emptyGuardian(false)])
            }
          >
            <Plus size={20} aria-hidden="true" />
            Agregar acudiente
          </button>
        )}
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
  const routeCode = searchParams.get("route");
  const editing = studentId !== undefined;
  const students = useResource(
    editing && routeCode ? `students:${routeCode}` : null,
    () => listStudents(routeCode ?? ""),
  );
  const geometries = useResource(
    routeCode ? `geometry:${routeCode}` : null,
    () => listTripGeometries({ routeCode: routeCode ?? "" }),
  );

  if (!routeCode) return <Navigate to="/guide/students" replace />;
  const student =
    students.data?.find((candidate) => candidate.id === Number(studentId)) ??
    null;

  return (
    <div className="page">
      <Link className="back-link" to={`/guide/students?route=${routeCode}`}>
        <ArrowLeft size={20} aria-hidden="true" />
        Estudiantes de {routeCode}
      </Link>
      <header className="page-header">
        <h1>{editing ? "Editar estudiante" : "Agregar estudiante"}</h1>
      </header>
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
              routeCode={routeCode}
              student={student}
              geometries={tripGeometries}
            />
          )
        }
      </AsyncContent>
    </div>
  );
}
