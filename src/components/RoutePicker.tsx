import type { Route } from "../api/types";

export function RoutePicker({
  routes,
  selected,
  onSelect,
}: {
  routes: Route[];
  selected: string;
  onSelect: (code: string) => void;
}) {
  if (routes.length === 1) return null;
  return (
    <div className="segmented" role="group" aria-label="Ruta">
      {routes.map((route) => (
        <button
          key={route.code}
          type="button"
          aria-pressed={route.code === selected}
          onClick={() => onSelect(route.code)}
        >
          {route.code}
        </button>
      ))}
    </div>
  );
}
