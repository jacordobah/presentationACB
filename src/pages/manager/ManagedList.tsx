import { Pencil, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Sheet } from "../../components/Sheet";
import { EmptyState } from "../../components/States";
import { errorMessage, useToast } from "../../components/toast/ToastContext";

interface ManagedListProps<T> {
  items: T[];
  noun: string;
  addLabel: string;
  keyOf: (item: T) => string | number;
  nameOf: (item: T) => string;
  isActive: (item: T) => boolean;
  renderDetails: (item: T) => ReactNode;
  renderForm: (item: T | null, close: () => void) => ReactNode;
  deactivate: (item: T) => Promise<void>;
  deactivateWarning: string;
}

// Shared list for the management sections: create, edit and logically delete
// (deactivate).
export function ManagedList<T>({
  items,
  noun,
  addLabel,
  keyOf,
  nameOf,
  isActive,
  renderDetails,
  renderForm,
  deactivate,
  deactivateWarning,
}: ManagedListProps<T>) {
  const toast = useToast();
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<{ item: T | null } | null>(null);
  const [deactivating, setDeactivating] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const visible = items
    .filter((item) => showInactive || isActive(item))
    .toSorted((a, b) => Number(isActive(b)) - Number(isActive(a)));

  const confirmDeactivate = async () => {
    if (!deactivating) return;
    setBusy(true);
    try {
      await deactivate(deactivating);
      toast.show(`${nameOf(deactivating)} quedó desactivado.`, {
        tone: "success",
      });
      setDeactivating(null);
    } catch (error) {
      toast.show(errorMessage(error), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <div className="section__header">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(event) => setShowInactive(event.target.checked)}
          />
          Mostrar inactivos
        </label>
        <button
          type="button"
          className="button button--primary"
          onClick={() => setEditing({ item: null })}
        >
          <Plus size={20} aria-hidden="true" />
          {addLabel}
        </button>
      </div>

      {visible.length === 0 ? (
        <EmptyState title={`No hay ${noun} para mostrar`} />
      ) : (
        <ul className="list">
          {visible.map((item) => {
            const active = isActive(item);
            return (
              <li
                key={keyOf(item)}
                className={active ? "list-row" : "list-row list-row--inactive"}
              >
                <div className="list-row__top">
                  <strong>{nameOf(item)}</strong>
                  {!active && <span className="chip">Inactivo</span>}
                </div>
                {renderDetails(item)}
                {active && (
                  <div className="cluster">
                    <button
                      type="button"
                      className="button"
                      onClick={() => setEditing({ item })}
                    >
                      <Pencil size={20} aria-hidden="true" />
                      Editar
                    </button>
                    <button
                      type="button"
                      className="button button--quiet"
                      onClick={() => setDeactivating(item)}
                    >
                      Desactivar
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Sheet
        open={editing !== null}
        title={editing?.item ? `Editar ${nameOf(editing.item)}` : addLabel}
        onClose={() => setEditing(null)}
        variant="dialog"
      >
        {editing && renderForm(editing.item, () => setEditing(null))}
      </Sheet>
      <ConfirmDialog
        open={deactivating !== null}
        title={`¿Desactivar ${deactivating ? nameOf(deactivating) : ""}?`}
        confirmLabel="Desactivar"
        danger
        busy={busy}
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivating(null)}
      >
        <p>{deactivateWarning}</p>
      </ConfirmDialog>
    </div>
  );
}
