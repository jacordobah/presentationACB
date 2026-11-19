import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { createRoute } from "../../api/routes";
import { listSchools } from "../../api/schools";
import { useSessionUser } from "../../auth/AuthContext";
import { AsyncContent } from "../../components/AsyncContent";
import { Field } from "../../components/Field";
import { Notice } from "../../components/Notice";
import { errorMessage, useToast } from "../../components/toast/ToastContext";
import { useResource } from "../../hooks/useResource";
import { TRIP_LABELS } from "../../lib/labels";
import type { TripCode } from "../../api/types";

const ROUTE_CODE = /^[A-Z]{2}\d{2}$/;

export default function NewRoutePage() {
  const user = useSessionUser();
  const navigate = useNavigate();
  const toast = useToast();
  const zone = user.zone ?? "";
  const schools = useResource(`schools:${zone}`, async () =>
    (await listSchools(zone)).filter((school) => school.active),
  );
  const [code, setCode] = useState(zone);
  const [schoolId, setSchoolId] = useState("");
  const [description, setDescription] = useState("");
  const [shiftCode, setShiftCode] = useState<TripCode>("541");
  const [scheduledStartTime, setScheduledStartTime] = useState("06:00");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    const found: Record<string, string> = {};
    if (!ROUTE_CODE.test(normalizedCode) || !normalizedCode.startsWith(zone)) {
      found.code = `Usa las letras de tu zona y dos dígitos, por ejemplo ${zone}04.`;
    }
    if (!schoolId) found.school = "Elige el colegio de destino.";
    if (!description.trim())
      found.description = "Describe por dónde pasa la ruta.";
    if (!scheduledStartTime) found.start = "Elige la hora de inicio.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setServerError(null);
    try {
      const route = await createRoute({
        routeCode: normalizedCode,
        shiftCode,
        schoolId: Number(schoolId),
        description: description.trim(),
        scheduledStartTime: `${scheduledStartTime}:00`,
      });
      toast.show("Ruta creada. Ahora carga el KMZ de cada recorrido.", {
        tone: "success",
      });
      navigate(`/guide/routes/${route.routeId}`);
    } catch (error) {
      setServerError(errorMessage(error));
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <Link className="back-link" to="/guide/routes">
        <ArrowLeft size={20} aria-hidden="true" />
        Rutas
      </Link>
      <header className="page-header">
        <h1>Proponer ruta</h1>
      </header>
      <AsyncContent resource={schools} loadingLabel="Cargando colegios…">
        {(list) => (
          <form className="form" onSubmit={handleSubmit} noValidate>
            {serverError && <Notice tone="error">{serverError}</Notice>}
            <Field
              label="Código de la ruta"
              hint="Dos letras de la localidad y dos dígitos."
              error={errors.code}
            >
              {(control) => (
                <input
                  {...control}
                  className="input"
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={4}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.toUpperCase())
                  }
                />
              )}
            </Field>
            <Field label="Colegio" error={errors.school}>
              {(control) => (
                <select
                  {...control}
                  className="input"
                  value={schoolId}
                  onChange={(event) => setSchoolId(event.target.value)}
                >
                  <option value="">Elige un colegio</option>
                  {list.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
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
                  value={shiftCode}
                  onChange={(event) =>
                    setShiftCode(event.target.value as TripCode)
                  }
                >
                  {(["541", "542"] as const).map((value) => (
                    <option key={value} value={value}>
                      {value} {TRIP_LABELS[value]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Hora de inicio" error={errors.start}>
              {(control) => (
                <input
                  {...control}
                  className="input"
                  type="time"
                  value={scheduledStartTime}
                  onChange={(event) =>
                    setScheduledStartTime(event.target.value)
                  }
                />
              )}
            </Field>
            <Field label="Descripción" error={errors.description}>
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
              {saving ? "Creando…" : "Crear ruta"}
            </button>
          </form>
        )}
      </AsyncContent>
    </div>
  );
}
