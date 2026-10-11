import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import {
  createStaff,
  deactivateStaff,
  listStaff,
  updateStaff,
  type StaffKind,
} from "../../api/staff";
import type {
  DocumentType,
  StaffInput,
  StaffMember,
  Zone,
} from "../../api/types";
import { AsyncContent } from "../../components/AsyncContent";
import { Field } from "../../components/Field";
import { Notice } from "../../components/Notice";
import { errorMessage, useToast } from "../../components/toast/ToastContext";
import { useResource } from "../../hooks/useResource";
import { DOCUMENT_TYPE_LABELS } from "../../lib/labels";
import { ManagedList } from "./ManagedList";

const NOUNS: Record<StaffKind, { singular: string; plural: string }> = {
  guides: { singular: "guía", plural: "guías" },
  leaders: { singular: "líder", plural: "líderes" },
};

type StaffFields = Omit<StaffInput, "password"> & { password: string };

function validate(fields: StaffFields, creating: boolean) {
  const required: (keyof StaffFields)[] = [
    "documentNumber",
    "name",
    "address",
    "email",
    "phone",
    "zone",
    "contractNumber",
    "username",
  ];
  if (required.some((key) => !fields[key].trim()))
    return "Completa todos los campos.";
  if (!/^[A-Za-z0-9]{4,15}$/.test(fields.documentNumber.trim())) {
    return "El número de documento debe tener entre 4 y 15 letras o dígitos.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()))
    return "El correo no es válido.";
  if (!/^\d{10}$/.test(fields.phone.trim()))
    return "El teléfono debe tener 10 dígitos.";
  if (creating && fields.password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  return null;
}

function StaffForm({
  kind,
  member,
  zones,
  onSaved,
}: {
  kind: StaffKind;
  member: StaffMember | null;
  zones: Zone[];
  onSaved: () => void;
}) {
  const toast = useToast();
  const [fields, setFields] = useState<StaffFields>({
    documentType: member?.documentType ?? "CC",
    documentNumber: member?.documentNumber ?? "",
    name: member?.name ?? "",
    address: member?.address ?? "",
    email: member?.email ?? "",
    phone: member?.phone ?? "",
    zone: member?.zone ?? "",
    contractNumber: member?.contractNumber ?? "",
    username: member?.username ?? "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof StaffFields) => (value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = validate(fields, member === null);
    if (problem) {
      setError(problem);
      return;
    }
    const { password, ...rest } = fields;
    const input: StaffInput = Object.fromEntries(
      Object.entries(rest).map(([key, value]) => [key, value.trim()]),
    ) as StaffInput;
    setSaving(true);
    setError(null);
    try {
      if (member) await updateStaff(kind, member.id, input);
      else await createStaff(kind, { ...input, password });
      toast.show(`Se guardaron los datos de ${input.name}.`, {
        tone: "success",
      });
      onSaved();
    } catch (caught) {
      setError(errorMessage(caught));
      setSaving(false);
    }
  };

  const text = (
    key: keyof StaffFields,
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
        <Field label="Tipo de documento">
          {(control) => (
            <select
              {...control}
              className="input"
              value={fields.documentType}
              onChange={(event) =>
                set("documentType")(event.target.value as DocumentType)
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
        {text("documentNumber", "Número de documento", { autoComplete: "off" })}
        {text("name", "Nombre completo", { autoComplete: "off" })}
        {text("address", "Dirección", { autoComplete: "off" })}
        {text("email", "Correo", { type: "email", autoComplete: "off" })}
        {text("phone", "Teléfono", { type: "tel", inputMode: "numeric" })}
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
        {text("contractNumber", "Número de contrato", { autoComplete: "off" })}
        {text("username", "Usuario", {
          autoComplete: "off",
          autoCapitalize: "none",
        })}
        {member === null &&
          text("password", "Contraseña", {
            type: "password",
            autoComplete: "new-password",
          })}
      </div>
      <button
        type="submit"
        className="button button--primary button--large"
        disabled={saving}
      >
        {saving ? "Guardando…" : `Guardar ${NOUNS[kind].singular}`}
      </button>
    </form>
  );
}

export function StaffSection({
  kind,
  zones,
}: {
  kind: StaffKind;
  zones: Zone[];
}) {
  const staff = useResource(`admin:${kind}`, () => listStaff(kind));
  const nouns = NOUNS[kind];

  return (
    <AsyncContent resource={staff} loadingLabel={`Cargando ${nouns.plural}…`}>
      {(list) => (
        <ManagedList
          items={list}
          noun={nouns.plural}
          addLabel={`Agregar ${nouns.singular}`}
          keyOf={(member) => member.id}
          nameOf={(member) => member.name}
          isActive={(member) => member.active}
          renderDetails={(member) => (
            <dl className="facts">
              <div>
                <dt>Documento</dt>
                <dd>
                  {member.documentType} {member.documentNumber}
                </dd>
              </div>
              <div>
                <dt>Zona</dt>
                <dd>{member.zone}</dd>
              </div>
              <div>
                <dt>Usuario</dt>
                <dd>{member.username}</dd>
              </div>
              <div>
                <dt>Contrato</dt>
                <dd>{member.contractNumber}</dd>
              </div>
            </dl>
          )}
          renderForm={(member, close) => (
            <StaffForm
              kind={kind}
              member={member}
              zones={zones}
              onSaved={() => {
                close();
                staff.reload();
              }}
            />
          )}
          deactivate={async (member) => {
            await deactivateStaff(kind, member.id);
            staff.reload();
          }}
          deactivateWarning={
            kind === "guides"
              ? "No podrá ingresar y se quita de las rutas que tenga asignadas. Sus registros se conservan."
              : "No podrá ingresar. Sus registros se conservan."
          }
        />
      )}
    </AsyncContent>
  );
}
