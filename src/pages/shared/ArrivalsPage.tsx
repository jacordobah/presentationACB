import { Clock } from "lucide-react";
import { useState } from "react";
import { listArrivals, updateArrivalStatus } from "../../api/arrivals";
import type { ArrivalStatus, ArrivalType, LateArrival } from "../../api/types";
import { listZones } from "../../api/zones";
import { useSessionUser } from "../../auth/AuthContext";
import { AsyncContent } from "../../components/AsyncContent";
import { Field } from "../../components/Field";
import { EmptyState } from "../../components/States";
import { errorMessage, useToast } from "../../components/toast/ToastContext";
import { useResource } from "../../hooks/useResource";
import { LIST_POLL_MS } from "../../lib/config";
import { formatShortDate } from "../../lib/dates";
import {
  ARRIVAL_STATUS_LABELS,
  ARRIVAL_STATUSES_BY_TYPE,
  ARRIVAL_TYPE_LABELS,
  arrivalActionLabel,
} from "../../lib/labels";

function ArrivalRow({
  arrival,
  onChanged,
}: {
  arrival: LateArrival;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const impact = arrival.type === "IMPACT";

  const changeStatus = async (status: ArrivalStatus) => {
    setSaving(true);
    try {
      await updateArrivalStatus(arrival.id, status);
      toast.show(
        `Estado cambiado a ${ARRIVAL_STATUS_LABELS[status].toLowerCase()}.`,
        {
          tone: "success",
        },
      );
      onChanged();
    } catch (error) {
      toast.show(errorMessage(error), { tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <li
      className={`list-row ${impact ? "list-row--emergency" : "list-row--late"}`}
    >
      <div className="list-row__top">
        <div className="list-row__title">
          <strong>{arrival.guideName}</strong>
          <span className="route-code">{arrival.routeCode}</span>
        </div>
        <span className={impact ? "chip chip--emergency" : "chip chip--late"}>
          {ARRIVAL_TYPE_LABELS[arrival.type]}
        </span>
      </div>
      <dl className="facts">
        <div>
          <dt>Fecha</dt>
          <dd>{formatShortDate(arrival.date)}</dd>
        </div>
        <div>
          <dt>Llegó tarde</dt>
          <dd>{arrival.minutesLate} min</dd>
        </div>
        <div>
          <dt>Acumuladas en el mes</dt>
          <dd>{arrival.accumulatedCount}</dd>
        </div>
        <div>
          <dt>Acción</dt>
          <dd>{arrivalActionLabel(arrival.type, arrival.action)}</dd>
        </div>
      </dl>
      <Field label="Estado del registro" className="arrival-status">
        {(control) => (
          <select
            {...control}
            className="input"
            value={arrival.status}
            disabled={saving}
            onChange={(event) =>
              changeStatus(event.target.value as ArrivalStatus)
            }
          >
            {ARRIVAL_STATUSES_BY_TYPE[arrival.type].map((status) => (
              <option key={status} value={status}>
                {ARRIVAL_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        )}
      </Field>
    </li>
  );
}

export default function ArrivalsPage() {
  const user = useSessionUser();
  const isManager = user.role === "MANAGER";
  const [zone, setZone] = useState("");
  const [type, setType] = useState<ArrivalType | "">("");
  const zoneFilter = isManager ? zone || null : user.zone;
  const zones = useResource(isManager ? "zones" : null, listZones);
  const arrivals = useResource(
    `arrivals:${zoneFilter ?? "all"}`,
    () => listArrivals({ zone: zoneFilter }),
    { pollMs: LIST_POLL_MS },
  );

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header__title">
          <h1>Llegadas fuera de programación</h1>
          <p className="page-header__subtitle">
            Llegadas al PE01 después de la hora de citación.
          </p>
        </div>
      </header>
      <div className="cluster">
        {isManager && (
          <select
            className="input arrivals-zone"
            aria-label="Zona"
            value={zone}
            onChange={(event) => setZone(event.target.value)}
          >
            <option value="">Todas las zonas</option>
            {zones.data?.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
        )}
        <div className="segmented" role="group" aria-label="Tipo de llegada">
          {(["", "NON_IMPACT", "IMPACT"] as const).map((option) => (
            <button
              key={option || "all"}
              type="button"
              aria-pressed={type === option}
              onClick={() => setType(option)}
            >
              {option ? ARRIVAL_TYPE_LABELS[option] : "Todas"}
            </button>
          ))}
        </div>
      </div>
      <AsyncContent
        resource={arrivals}
        loadingLabel="Cargando llegadas…"
        isEmpty={(list) =>
          !list.some((arrival) => !type || arrival.type === type)
        }
        empty={
          <EmptyState
            icon={Clock}
            title="No hay llegadas fuera de programación"
          />
        }
      >
        {(list) => (
          <ul className="list">
            {list
              .filter((arrival) => !type || arrival.type === type)
              .map((arrival) => (
                <ArrivalRow
                  key={arrival.id}
                  arrival={arrival}
                  onChanged={arrivals.reload}
                />
              ))}
          </ul>
        )}
      </AsyncContent>
    </div>
  );
}
