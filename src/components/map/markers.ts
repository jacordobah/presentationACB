import { divIcon, type DivIcon } from "leaflet";

export type PointMarkerState = "pending" | "current" | "done";

const FLAG_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 21V4m0 0h11l-2 4 2 4H5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>';

const cache = new Map<string, DivIcon>();

function cachedIcon(key: string, html: string, size: [number, number]) {
  let icon = cache.get(key);
  if (!icon) {
    icon = divIcon({
      className: "",
      html,
      iconSize: size,
      iconAnchor: [size[0] / 2, size[1] / 2],
    });
    cache.set(key, icon);
  }
  return icon;
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);

export function meetingPointIcon(
  order: number,
  state: PointMarkerState,
  final = false,
) {
  const classes = `map-pin map-pin--${state}${final ? " map-pin--final" : ""}`;
  return cachedIcon(
    `point:${order}:${state}:${final}`,
    `<span class="${classes}">${order}</span>`,
    [34, 34],
  );
}

export function destinationIcon() {
  return cachedIcon(
    "destination",
    `<span class="map-flag">${FLAG_SVG}</span>`,
    [36, 36],
  );
}

export function caravanIcon(
  label: string,
  emergency: boolean,
  selected: boolean,
) {
  const classes = `caravan-pin${emergency ? " caravan-pin--emergency" : ""}${selected ? " caravan-pin--selected" : ""}`;
  return cachedIcon(
    `caravan:${label}:${emergency}:${selected}`,
    `<span class="${classes}">${escapeHtml(label)}</span>`,
    [64, 34],
  );
}

export function reportIcon(
  code: string,
  emergency: boolean,
  selected: boolean,
) {
  const classes = `report-pin${emergency ? " report-pin--emergency" : ""}${selected ? " report-pin--selected" : ""}`;
  return cachedIcon(
    `report:${code}:${emergency}:${selected}`,
    `<span class="${classes}">${escapeHtml(code)}</span>`,
    [44, 30],
  );
}
