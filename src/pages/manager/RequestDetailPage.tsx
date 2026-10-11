import { ArrowLeft, Check, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { listTripGeometries } from "../../api/routeGeometry";
import { approveRoute, getRoute, rejectRoute } from "../../api/routes";
import type { Route } from "../../api/types";
import { AsyncContent } from "../../components/AsyncContent";
import { RouteStatusChip } from "../../components/Chips";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Field } from "../../components/Field";
import { Notice } from "../../components/Notice";
import { RoutePreview } from "../../components/RoutePreview";
import { Sheet } from "../../components/Sheet";
import { EmptyState } from "../../components/States";
import { errorMessage, useToast } from "../../components/toast/ToastContext";
import { useResource } from "../../hooks/useResource";
import { routeWithinLimits } from "../../lib/rules";

function RejectForm({
  route,
  onRejected,
}: {
  route: Route;
  onRejected: () => void;
}) {
  const toast = useToast();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!notes.trim()) {
      setError("Escribe qué debe corregir el guía.");
      return;
    }
    setSaving(true);
    try {
      await rejectRoute(route.code, notes.trim());
      toast.show(`Ruta ${route.code} rechazada.`, { tone: "success" });
      onRejected();
    } catch (caught) {
      setError(errorMessage(caught));
      setSaving(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <Field
        label="Observaciones para el guía"
        hint="Explica qué debe cambiar para volver a enviarla."
        error={error}
      >
        {(control) => (
          <textarea
            {...control}
            className="input"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        )}
      </Field>
      <button
        type="submit"
        className="button button--danger button--large"
        disabled={saving}
      >
        {saving ? "Rechazando…" : "Rechazar ruta"}
      </button>
    </form>
  );
}

function Review({ route }: { route: Route }) {
  const navigate = useNavigate();
  const toast = useToast();
  const geometries = useResource(`geometry:${route.code}`, () =>
    listTripGeometries({ routeCode: route.code }),
  );
  const [approving, setApproving] = useState(false);
  const [confirmingApproval, setConfirmingApproval] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const backToList = () => navigate("/manager/requests");

  const approve = async () => {
    setApproving(true);
    try {
      await approveRoute(route.code);
      toast.show(`Ruta ${route.code} aprobada.`, { tone: "success" });
      backToList();
    } catch (error) {
      toast.show(errorMessage(error), { tone: "error" });
      setApproving(false);
      setConfirmingApproval(false);
    }
  };

  return (
    <>
      <dl className="facts">
        <div>
          <dt>Colegio</dt>
          <dd>{route.schoolName}</dd>
        </div>
        <div>
          <dt>Propuesta por</dt>
          <dd>{route.proposedBy.name}</dd>
        </div>
        <div>
          <dt>Zona</dt>
          <dd>{route.zone}</dd>
        </div>
      </dl>
      <p>{route.description}</p>

      <AsyncContent
        resource={geometries}
        loadingLabel="Cargando trazados…"
        isEmpty={(list) => list.length === 0}
        empty={<EmptyState title="La ruta no tiene trazados cargados" />}
      >
        {(list) => (
          <>
            {!routeWithinLimits(list) && (
              <Notice tone="warning" title="Revisa las distancias">
                Los recorridos no cumplen los límites de 5,5 km por recorrido y
                11 km en total.
              </Notice>
            )}
            <RoutePreview routeCode={route.code} geometries={list} />
          </>
        )}
      </AsyncContent>

      {route.status === "IN_REVIEW" ? (
        <div className="button-row">
          <button
            type="button"
            className="button button--danger button--large"
            onClick={() => setRejecting(true)}
          >
            <X size={22} aria-hidden="true" />
            Rechazar ruta
          </button>
          <button
            type="button"
            className="button button--primary button--large"
            onClick={() => setConfirmingApproval(true)}
          >
            <Check size={22} aria-hidden="true" />
            Aprobar ruta
          </button>
        </div>
      ) : (
        <Notice tone="info">Esta ruta ya no está en revisión.</Notice>
      )}

      <ConfirmDialog
        open={confirmingApproval}
        title={`¿Aprobar la ruta ${route.code}?`}
        confirmLabel="Aprobar ruta"
        busy={approving}
        onConfirm={approve}
        onCancel={() => setConfirmingApproval(false)}
      >
        <p>La ruta queda disponible para programar guías y recorridos.</p>
      </ConfirmDialog>
      <Sheet
        open={rejecting}
        title={`Rechazar la ruta ${route.code}`}
        onClose={() => setRejecting(false)}
        variant="dialog"
      >
        <RejectForm route={route} onRejected={backToList} />
      </Sheet>
    </>
  );
}

export default function RequestDetailPage() {
  const { code = "" } = useParams();
  const route = useResource(`route:${code}`, () => getRoute(code));

  return (
    <div className="page">
      <Link className="back-link" to="/manager/requests">
        <ArrowLeft size={20} aria-hidden="true" />
        Solicitudes
      </Link>
      <AsyncContent resource={route} loadingLabel="Cargando la ruta…">
        {(loaded) => (
          <>
            <header className="page-header">
              <h1>Revisar ruta {loaded.code}</h1>
              <RouteStatusChip status={loaded.status} />
            </header>
            <Review route={loaded} />
          </>
        )}
      </AsyncContent>
    </div>
  );
}
