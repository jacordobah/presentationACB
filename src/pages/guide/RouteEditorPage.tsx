import { ArrowLeft, Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { importKmz, listTripGeometries } from "../../api/routeGeometry";
import { getRoute, updateRoute } from "../../api/routes";
import { listSchools } from "../../api/schools";
import type { Route, School, TripCode, TripGeometry } from "../../api/types";
import { AsyncContent } from "../../components/AsyncContent";
import { Field } from "../../components/Field";
import { Notice } from "../../components/Notice";
import { RoutePreview } from "../../components/RoutePreview";
import { errorMessage, useToast } from "../../components/toast/ToastContext";
import { useResource } from "../../hooks/useResource";
import { formatKilometers } from "../../lib/geo";
import { TRIP_LABELS, plural } from "../../lib/labels";

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
  const [description, setDescription] = useState(route.description ?? "");
  const [shiftCode, setShiftCode] = useState<TripCode>(route.shiftCode);
  const [scheduledStartTime, setScheduledStartTime] = useState(
    (route.scheduledStartTime ?? "").slice(0, 5),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!description.trim()) {
      setError("Describe por dónde pasa la ruta.");
      return;
    }
    if (!scheduledStartTime) {
      setError("Elige la hora de inicio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateRoute(route.routeId, {
        routeCode: route.routeCode,
        shiftCode,
        schoolId: Number(schoolId),
        description: description.trim(),
        scheduledStartTime: `${scheduledStartTime}:00`,
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
      <Field label="Jornada">
        {(control) => (
          <select
            {...control}
            className="input"
            value={shiftCode}
            onChange={(event) => setShiftCode(event.target.value as TripCode)}
          >
            {(["541", "542"] as const).map((code) => (
              <option key={code} value={code}>
                {code} {TRIP_LABELS[code]}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Hora de inicio">
        {(control) => (
          <input
            {...control}
            className="input"
            type="time"
            value={scheduledStartTime}
            onChange={(event) => setScheduledStartTime(event.target.value)}
          />
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
      <button type="submit" className="button" disabled={saving}>
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
  const [unlinked, setUnlinked] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setUnlinked(false);
    try {
      const { linked } = await importKmz(route.routeCode, tripCode, file);
      if (linked) {
        toast.show(`KMZ del recorrido ${tripCode} cargado.`, {
          tone: "success",
        });
      }
      setUnlinked(!linked);
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
      {unlinked && (
        <Notice tone="warning">
          El archivo se importó, pero ninguna línea se llama «{route.routeCode}{" "}
          {tripCode}…», así que no quedará asociado a este recorrido. Renombra
          la línea en el KMZ y súbelo de nuevo.
        </Notice>
      )}
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
  const geometries = useResource(`geometry:${route.routeCode}`, () =>
    listTripGeometries({ routeCode: route.routeCode }, route.schoolName),
  );
  const schools = useResource(`schools:${route.zone}`, async () =>
    (await listSchools(route.zone)).filter(
      (school) => school.active || school.id === route.schoolId,
    ),
  );

  return (
    <>
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
                <RoutePreview
                  routeCode={route.routeCode}
                  geometries={list}
                />
              )}
            </div>
          )}
        </AsyncContent>
      </section>
    </>
  );
}

export default function RouteEditorPage() {
  const { routeId = "" } = useParams();
  const numericId = Number(routeId);
  const route = useResource(`route:${routeId}`, () =>
    getRoute(numericId),
  );

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
                <h1>Ruta {loaded.routeCode}</h1>
                <p className="page-header__subtitle">{loaded.schoolName}</p>
              </div>
            </header>
            <RouteEditor route={loaded} onChanged={route.reload} />
          </>
        )}
      </AsyncContent>
    </div>
  );
}
