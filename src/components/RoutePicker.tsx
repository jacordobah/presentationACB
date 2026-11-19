import type { Route } from "../api/types";

export function RoutePicker({
  routes,
  selected,
  onSelect,
}: {
  routes: Route[];
  selected: string;
  onSelect: (routeCode: string) => void;
}) {
  if (routes.length === 1) return null;
  return (
    <div className="segmented" role="group" aria-label="Ruta">
      {routes.map((route) => (
        <button
          key={route.routeId}
          type="button"
          aria-pressed={route.routeCode === selected}
          onClick={() => onSelect(route.routeCode)}
        >
          {route.routeCode}
        </button>
      ))}
    </div>
  );
}
