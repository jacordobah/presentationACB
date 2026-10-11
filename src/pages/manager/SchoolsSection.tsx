import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import {
  createSchool,
  deactivateSchool,
  listSchools,
  updateSchool,
} from "../../api/schools";
import type { School, SchoolInput, Zone } from "../../api/types";
import { AsyncContent } from "../../components/AsyncContent";
import { Field } from "../../components/Field";
import { Notice } from "../../components/Notice";
import { errorMessage, useToast } from "../../components/toast/ToastContext";
import { useResource } from "../../hooks/useResource";
import { ManagedList } from "./ManagedList";

interface SchoolFields {
  name: string;
  schoolCode: string;
  phone: string;
  address: string;
  zone: string;
  latitude: string;
  longitude: string;
}

function toInput(fields: SchoolFields): SchoolInput | string {
  const latitude = Number(fields.latitude.replace(",", "."));
  const longitude = Number(fields.longitude.replace(",", "."));
  if (
    !fields.name.trim() ||
    !fields.schoolCode.trim() ||
    !fields.address.trim()
  ) {
    return "Completa el nombre, el código DANE y la dirección.";
  }
  if (!/^\d{10}$/.test(fields.phone.trim()))
    return "El teléfono debe tener 10 dígitos.";
  if (!fields.zone) return "Elige la zona del colegio.";
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90)
    return "La latitud no es válida.";
  if (!Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    return "La longitud no es válida.";
  }
  return {
    name: fields.name.trim(),
    schoolCode: fields.schoolCode.trim(),
    phone: fields.phone.trim(),
    address: fields.address.trim(),
    zone: fields.zone,
    latitude,
    longitude,
  };
}

function SchoolForm({
  school,
  zones,
  onSaved,
}: {
  school: School | null;
  zones: Zone[];
  onSaved: () => void;
}) {
  const toast = useToast();
  const [fields, setFields] = useState<SchoolFields>({
    name: school?.name ?? "",
    schoolCode: school?.schoolCode ?? "",
    phone: school?.phone ?? "",
    address: school?.address ?? "",
    zone: school?.zone ?? "",
    latitude: school ? String(school.latitude) : "",
    longitude: school ? String(school.longitude) : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof SchoolFields) => (value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = toInput(fields);
    if (typeof input === "string") {
      setError(input);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (school) await updateSchool(school.id, input);
      else await createSchool(input);
      toast.show("Colegio guardado.", { tone: "success" });
      onSaved();
    } catch (caught) {
      setError(errorMessage(caught));
      setSaving(false);
    }
  };

  const text = (
    key: keyof SchoolFields,
    label: string,
    extra: InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <Field label={label}>
      {(control) => (
        <input
          {...control}
          {...extra}
          className="input"
          value={fields[key]}
          onChange={(event) => set(key)(event.target.value)}
        />
      )}
    </Field>
  );

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="form-grid">
        {text("name", "Nombre")}
        {text("schoolCode", "Código DANE", { inputMode: "numeric" })}
        {text("phone", "Teléfono", { type: "tel", inputMode: "numeric" })}
        {text("address", "Dirección")}
        <Field label="Zona">
          {(control) => (
            <select
              {...control}
              className="input"
              value={fields.zone}
              onChange={(event) => set("zone")(event.target.value)}
            >
              <option value="">Elige una zona</option>
              {zones.map((zone) => (
                <option key={zone.code} value={zone.code}>
                  {zone.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        {text("latitude", "Latitud", { inputMode: "decimal" })}
        {text("longitude", "Longitud", { inputMode: "decimal" })}
      </div>
      <button
        type="submit"
        className="button button--primary button--large"
        disabled={saving}
      >
        {saving ? "Guardando…" : "Guardar colegio"}
      </button>
    </form>
  );
}

export function SchoolsSection({ zones }: { zones: Zone[] }) {
  const schools = useResource("admin:schools", () => listSchools());
  const zoneName = (code: string) =>
    zones.find((zone) => zone.code === code)?.name ?? code;

  return (
    <AsyncContent resource={schools} loadingLabel="Cargando colegios…">
      {(list) => (
        <ManagedList
          items={list}
          noun="colegios"
          addLabel="Agregar colegio"
          keyOf={(school) => school.id}
          nameOf={(school) => school.name}
          isActive={(school) => school.active}
          renderDetails={(school) => (
            <dl className="facts">
              <div>
                <dt>Código DANE</dt>
                <dd>{school.schoolCode}</dd>
              </div>
              <div>
                <dt>Zona</dt>
                <dd>{zoneName(school.zone)}</dd>
              </div>
              <div>
                <dt>Dirección</dt>
                <dd>{school.address}</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>{school.phone}</dd>
              </div>
            </dl>
          )}
          renderForm={(school, close) => (
            <SchoolForm
              school={school}
              zones={zones}
              onSaved={() => {
                close();
                schools.reload();
              }}
            />
          )}
          deactivate={async (school) => {
            await deactivateSchool(school.id);
            schools.reload();
          }}
          deactivateWarning="El colegio deja de aparecer al crear rutas. Sus datos se conservan."
        />
      )}
    </AsyncContent>
  );
}
