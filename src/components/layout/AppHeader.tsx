import { Bike, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth, useSessionUser } from "../../auth/AuthContext";
import { ROLE_LABELS } from "../../lib/labels";
import { useActiveTrip } from "../../location/activeTrip";
import { ConfirmDialog } from "../ConfirmDialog";

export function AppHeader() {
  const user = useSessionUser();
  const { signOut } = useAuth();
  const activeTrip = useActiveTrip(user.id);
  const [confirming, setConfirming] = useState(false);

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">
          <Bike size={22} strokeWidth={2.5} />
        </span>
        <span className="brand__name">Al Colegio en Bici</span>
      </div>
      <div className="app-header__user">
        <div className="user-badge">
          <span className="user-badge__name">{user.name}</span>
          <span className="user-badge__role">
            {ROLE_LABELS[user.role]}
            {user.zone && (
              <span className="user-badge__zone">Zona {user.zone}</span>
            )}
          </span>
        </div>
        <button
          type="button"
          className="header-button"
          onClick={() => (activeTrip ? setConfirming(true) : signOut())}
        >
          <LogOut size={20} aria-hidden="true" />
          <span>Salir</span>
        </button>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Tienes un recorrido en curso"
        confirmLabel="Salir de todos modos"
        danger
        onConfirm={signOut}
        onCancel={() => setConfirming(false)}
      >
        <p>
          Si sales, tu teléfono deja de enviar la ubicación del recorrido hasta
          que vuelvas a ingresar.
        </p>
      </ConfirmDialog>
    </header>
  );
}
