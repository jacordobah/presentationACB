import { useState, type FormEvent } from "react";
import {
  createRoute,
  deactivateRoute,
  listRoutes,
  updateRoute,
} from "../../api/routes";
import { listSchools } from "../../api/schools";
import type { Route, School } from "../../api/types";
import { AsyncContent } from "../../components/AsyncContent";
import { RouteStatusChip } from "../../components/Chips";
import { Field } from "../../components/Field";
import { Notice } from "../../components/Notice";
import { errorMessage, useToast } from "../../components/toast/ToastContext";
import { useResource } from "../../hooks/useResource";
import { ManagedList } from "./ManagedList";

const ROUTE_CODE = /^[A-Z]{2}\d{2}$/;

function RouteForm({
  route,
  schools,
  onSaved,
}: {
  route: Route | null;
  schools: School[];
  onSaved: () => void;
}) {
  const toast = useToast();
  const [code, setCode] = useState(route?.code ?? "");
  const [schoolId, setSchoolId] = useState(route ? String(route.schoolId) : "");
  const [description, setDescription] = useState(route?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const zone = code.slice(0, 2);
  const options = schools.filter(
    (school) =>
      school.zone === zone && (school.active || school.id === route?.schoolId),
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ROUTE_CODE.test(code)) {
      setError(
        "El código lleva las dos letras de la localidad y dos dígitos, por ejemplo KE02.",
      );
      return;
    }
    if (!schoolId || !description.trim()) {
      setError("Elige el colegio y escribe la descripción.");
      return;
    }
    const input = {
      code,
      schoolId: Number(schoolId),
      description: description.trim(),
    };
    setSaving(true);
    setError(null);
    try {
      if (route) await updateRoute(route.code, input);
      else await createRoute(input);
      toast.show(`Ruta ${code} guardada.`, { tone: "success" });
      onSaved();
    } catch (caught) {
      setError(errorMessage(caught));
      setSaving(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {error && <Notice tone="error">{error}</Notice>}
      <Field
        label="Código"
        hint={
          route ? "El código no se puede cambiar." : "Por ejemplo MM04 o KE02."
        }
      >
        {(control) => (
          <input
            {...control}
            className="input"
            value={code}
            maxLength={4}
            disabled={route !== null}
            autoComplete="off"
            onChange={(event) => {
              setCode(event.target.value.toUpperCase());
              setSchoolId("");
            }}
          />
        )}
      </Field>
      <Field
        label="Colegio"
        hint={zone.length < 2 ? "Escribe primero el código." : undefined}
      >
        {(control) => (
          <select
            {...control}
            className="input"
            value={schoolId}
            onChange={(event) => setSchoolId(event.target.value)}
          >
            <option value="">Elige un colegio</option>
            {options.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Descripción">
        {(control) => (
          <textarea
            {...control}
            className="input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        )}
      </Field>
      <button
        type="submit"
        className="button button--primary button--large"
        disabled={saving}
      >
        {saving ? "Guardando…" : "Guardar ruta"}
      </button>
    </form>
  );
}

export function RoutesSection() {
  const routes = useResource("admin:routes", () => listRoutes());
  const schools = useResource("admin:schools", () => listSchools());

  return (
    <AsyncContent resource={routes} loadingLabel="Cargando rutas…">
      {(list) => (
        <ManagedList
          items={list}
          noun="rutas"
          addLabel="Agregar ruta"
          keyOf={(route) => route.code}
          nameOf={(route) => `Ruta ${route.code}`}
          isActive={(route) => route.active}
          renderDetails={(route) => (
            <>
              <dl className="facts">
                <div>
                  <dt>Colegio</dt>
                  <dd>{route.schoolName}</dd>
                </div>
                <div>
                  <dt>Estudiantes</dt>
                  <dd>{route.studentCount}</dd>
                </div>
              </dl>
              <RouteStatusChip status={route.status} />
            </>
          )}
          renderForm={(route, close) => (
            <RouteForm
              route={route}
              schools={schools.data ?? []}
              onSaved={() => {
                close();
                routes.reload();
              }}
            />
          )}
          deactivate={async (route) => {
            await deactivateRoute(route.code);
            routes.reload();
          }}
          deactivateWarning="La ruta deja de estar disponible para programar. Su historial se conserva."
        />
      )}
    </AsyncContent>
  );
}
