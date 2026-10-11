import type { LocationStatus } from "../location/LocationContext";
import { Notice } from "./Notice";

export function LocationNotice({ status }: { status: LocationStatus }) {
  switch (status) {
    case "denied":
      return (
        <Notice tone="error" title="Activa el permiso de ubicación">
          <ol className="steps">
            <li>
              En Chrome, toca el ícono de ajustes o el candado junto a la
              dirección de la página.
            </li>
            <li>Entra a Permisos y activa Ubicación.</li>
            <li>
              Revisa que la ubicación del teléfono esté encendida en Ajustes y
              recarga la página.
            </li>
          </ol>
        </Notice>
      );
    case "unavailable":
      return (
        <Notice tone="warning" title="No logramos obtener tu ubicación">
          Revisa que la ubicación del teléfono esté encendida. Si estás bajo
          techo, sal a un lugar despejado.
        </Notice>
      );
    case "unsupported":
      return (
        <Notice
          tone="error"
          title="Este navegador no permite usar la ubicación"
        >
          Abre la aplicación en Chrome para Android.
        </Notice>
      );
    case "waiting":
      return <Notice tone="info">Buscando tu ubicación…</Notice>;
    default:
      return null;
  }
}
