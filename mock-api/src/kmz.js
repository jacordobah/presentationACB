import JSZip from "jszip";
import { unprocessable } from "./http.js";

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeText(raw) {
  const cdata = raw.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  if (cdata) return cdata[1].trim();
  return raw
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, entity) => ENTITIES[entity])
    .trim();
}

function childText(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? decodeText(match[1]) : null;
}

function parseCoordinates(text) {
  return text
    .trim()
    .split(/\s+/)
    .map((tuple) => tuple.split(",").slice(0, 2).map(Number))
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
}

// Mirrors the geolocaACB reader: the first LineString is the trip geometry and
// every Point placemark is a meeting point, in document order.
export function parseKml(kml) {
  let line = null;
  const points = [];
  for (const [, body] of kml.matchAll(
    /<Placemark\b[^>]*>([\s\S]*?)<\/Placemark>/g,
  )) {
    const name = childText(body, "name");
    const description = childText(body, "description");
    const lineString = childText(body, "LineString");
    const point = childText(body, "Point");
    if (lineString && !line) {
      line = {
        name,
        coordinates: parseCoordinates(
          childText(lineString, "coordinates") ?? "",
        ),
      };
    } else if (point) {
      const [location] = parseCoordinates(
        childText(point, "coordinates") ?? "",
      );
      if (location) points.push({ name, description, location });
    }
  }
  return { line, points };
}

export async function readKmz(buffer) {
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw unprocessable("El archivo no es un KMZ válido.");
  }
  const kmlFile = zip.file("doc.kml") ?? zip.file(/\.kml$/i)[0];
  if (!kmlFile) throw unprocessable("El KMZ no contiene un archivo KML.");
  return parseKml(await kmlFile.async("string"));
}
