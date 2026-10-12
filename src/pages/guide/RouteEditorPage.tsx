import { ArrowLeft, Send, Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { importKmz, listTripGeometries } from "../../api/routeGeometry";
import { getRoute, submitRoute, updateRoute } from "../../api/routes";
import { listSchools } from "../../api/schools";
import type { Route, School, TripCode, TripGeometry } from "../../api/types";
import { AsyncContent } from "../../components/AsyncContent";
import { RouteStatusChip } from "../../components/Chips";
import { Field } from "../../components/Field";
import { Notice } from "../../components/Notice";
import { RoutePreview } from "../../components/RoutePreview";
import { errorMessage, useToast } from "../../components/toast/ToastContext";
import { useResource } from "../../hooks/useResource";
import { formatKilometers } from "../../lib/geo";
import { TRIP_LABELS, plural } from "../../lib/labels";
import { routeWithinLimits } from "../../lib/rules";

function RouteDetailsForm({
  route,
  schools,
  onSaved,
}: {
  route: Route;
  schools: School[];
  onSaved: () => void;
}) {
  const toast = useToast();
  const [schoolId, setSchoolId] = useState(String(route.schoolId));
  const [description, setDescription] = useState(route.description);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const locked = route.status === "IN_REVIEW";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!description.trim()) {
      setError("Describe por dónde pasa la ruta.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateRoute(route.code, {
        code: route.code,
        schoolId: Number(schoolId),
        description: description.trim(),
      });
      toast.show("Cambios guardados.", { tone: "success" });
      onSaved();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {error && <Notice tone="error">{error}</Notice>}
      <Field label="Colegio">
        {(control) => (
          <select
            {...control}
            className="input"
            value={schoolId}
            disabled={locked}
            onChange={(event) => setSchoolId(event.target.value)}
          >
            {schools.map((school) => (
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
            disabled={locked}
            onChange={(event) => setDescription(event.target.value)}
          />
        )}
      </Field>
      {route.status === "APPROVED" && (
        <p className="field__hint">
          Al guardar cambios, la ruta vuelve a borrador y debe enviarse a
          revisión otra vez.
        </p>
      )}
      <button type="submit" className="button" disabled={locked || saving}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}

function KmzUpload({
  route,
  tripCode,
  geometry,
  onUploaded,
}: {
  route: Route;
  tripCode: TripCode;
  geometry: TripGeometry | undefined;
  onUploaded: () => void;
}) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const locked = route.status === "IN_REVIEW";

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await importKmz(route.code, tripCode, file);
      toast.show(`KMZ del recorrido ${tripCode} cargado.`, { tone: "success" });
      setFile(null);
      onUploaded();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="kmz-upload">
      <div className="list-row__top">
        <h3>
          {tripCode} {TRIP_LABELS[tripCode]}
        </h3>
        {geometry ? (
          <span className="chip chip--done">
            {formatKilometers(geometry.lengthM)},{" "}
            {plural(geometry.meetingPoints.length, "punto", "puntos")}
          </span>
        ) : (
          <span className="chip">Sin KMZ</span>
        )}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!locked && (
        <div className="cluster">
          <label className="button file-button">
            <Upload size={20} aria-hidden="true" />
            {file ? file.name : "Elegir archivo KMZ"}
            <input
              type="file"
              accept=".kmz,application/vnd.google-earth.kmz"
              className="visually-hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            className="button button--primary"
            disabled={!file || uploading}
            onClick={upload}
          >
            {uploading ? "Cargando…" : `Cargar KMZ del ${tripCode}`}
          </button>
        </div>
      )}
    </div>
  );
}

function RouteEditor({
  route,
  onChanged,
}: {
  route: Route;
  onChanged: () => void;
}) {
  const toast = useToast();
  const geometries = useResource(`geometry:${route.code}`, () =>
    listTripGeometries({ routeCode: route.code }, route.schoolName),
  );
  const schools = useResource(`schools:${route.zone}`, async () =>
    (await listSchools(route.zone)).filter(
      (school) => school.active || school.id === route.schoolId,
    ),
  );
  const [submitting, setSubmitting] = useState(false);
  const tripGeometries = geometries.data ?? [];
  const canSubmit =
    (route.status === "DRAFT" || route.status === "REJECTED") &&
    routeWithinLimits(tripGeometries);

  const submit = async () => {
    setSubmitting(true);
    try {
      await submitRoute(route.code);
      toast.show("Ruta enviada a revisión.", { tone: "success" });
      onChanged();
    } catch (error) {
      toast.show(errorMessage(error), { tone: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {route.status === "REJECTED" && route.reviewNotes && (
        <Notice tone="warning" title="Observaciones de la revisión">
          {route.reviewNotes}
        </Notice>
      )}
      {route.status === "IN_REVIEW" && (
        <Notice tone="info" title="La ruta está en revisión">
          Podrás hacer cambios cuando el gerente operativo responda.
        </Notice>
      )}

      <section className="section" aria-labelledby="details-title">
        <h2 id="details-title">Datos de la ruta</h2>
        <AsyncContent resource={schools} loadingLabel="Cargando colegios…">
          {(list) => (
            <RouteDetailsForm
              route={route}
              schools={list}
              onSaved={onChanged}
            />
          )}
        </AsyncContent>
      </section>

      <section className="section" aria-labelledby="kmz-title">
        <h2 id="kmz-title">Trazado de los recorridos</h2>
        <p className="muted">
          Carga un KMZ por recorrido. Cada recorrido puede medir hasta 5,5 km y
          los dos juntos hasta 11 km.
        </p>
        <AsyncContent resource={geometries} loadingLabel="Cargando trazados…">
          {(list) => (
            <div className="stack">
              {(["541", "542"] as const).map((tripCode) => (
                <KmzUpload
                  key={tripCode}
                  route={route}
                  tripCode={tripCode}
                  geometry={list.find(
                    (geometry) => geometry.tripCode === tripCode,
                  )}
                  onUploaded={geometries.reload}
                />
              ))}
              {list.length > 0 && (
                <RoutePreview routeCode={route.code} geometries={list} />
              )}
            </div>
          )}
        </AsyncContent>
      </section>

      {(route.status === "DRAFT" || route.status === "REJECTED") && (
        <section className="section">
          <button
            type="button"
            className="button button--primary button--large"
            disabled={!canSubmit || submitting}
            onClick={submit}
          >
            <Send size={22} aria-hidden="true" />
            {submitting ? "Enviando…" : "Enviar a revisión"}
          </button>
          {!canSubmit && (
            <p className="field__hint">
              Para enviarla, carga los dos recorridos dentro de los límites de
              distancia.
            </p>
          )}
        </section>
      )}
    </>
  );
}

export default function RouteEditorPage() {
  const { code = "" } = useParams();
  const route = useResource(`route:${code}`, () => getRoute(code));

  return (
    <div className="page">
      <Link className="back-link" to="/guide/routes">
        <ArrowLeft size={20} aria-hidden="true" />
        Rutas
      </Link>
      <AsyncContent resource={route} loadingLabel="Cargando la ruta…">
        {(loaded) => (
          <>
            <header className="page-header">
              <div className="page-header__title">
                <h1>Ruta {loaded.code}</h1>
                <p className="page-header__subtitle">{loaded.schoolName}</p>
              </div>
              <RouteStatusChip status={loaded.status} />
            </header>
            <RouteEditor route={loaded} onChanged={route.reload} />
          </>
        )}
      </AsyncContent>
    </div>
  );
}
