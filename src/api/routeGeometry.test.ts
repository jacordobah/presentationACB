import { afterEach, describe, expect, it, vi } from "vitest";
import { listTripGeometries, tripCodesFromRoute } from "./routeGeometry";

describe("tripCodesFromRoute", () => {
  it("uses the separate geoloca fields", () => {
    expect(
      tripCodesFromRoute({
        name: "541 RUTA LICEO",
        route_code: "MM01",
        code: "541",
      }),
    ).toEqual({ routeCode: "MM01", tripCode: "541" });
  });

  it("falls back to the line name for older imports", () => {
    expect(
      tripCodesFromRoute({
        name: "MM01-542 Ruta de regreso",
      }),
    ).toEqual({ routeCode: "MM01", tripCode: "542" });
  });

  it("rejects routes without a route or trip code", () => {
    expect(tripCodesFromRoute({ name: "RUTA CENTRO" })).toBeNull();
    expect(
      tripCodesFromRoute({ name: "541 SIN RUTA", code: "541" }),
    ).toBeNull();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listTripGeometries", () => {
  it("uses each route meeting points and prepends the school for 542", async () => {
    const route = (id: string, code: "541" | "542", start: string) => ({
      _id: id,
      name: `${code} RUTA DEMO`,
      route_code: "MM01",
      code,
      start_meeting_point_id: start,
      meeting_point_ids: ["p1", "p2"],
      geometry: {
        type: "LineString",
        coordinates: [
          [start === "school" ? -74.2 : -74.1, start === "school" ? 4.7 : 4.6],
          [-74.15, 4.65],
          [-74.2, 4.7],
        ],
      },
    });
    const point = (id: string, name: string, lng: number, lat: number) => ({
      _id: id,
      name,
      description: null,
      location: { type: "Point", coordinates: [lng, lat] },
    });
    const payloads = {
      "/api/geo/routes": [
        route("r541", "541", "p1"),
        route("r542", "542", "school"),
      ],
      "/api/geo/meeting-points": [
        point("p1", "PE01", -74.1, 4.6),
        point("p2", "PE02", -74.15, 4.65),
        point("school", "Colegio Demo", -74.2, 4.7),
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        status: 200,
        json: async () =>
          payloads[
            url.includes("meeting-points")
              ? "/api/geo/meeting-points"
              : "/api/geo/routes"
          ],
      })),
    );

    const geometries = await listTripGeometries();
    const route541 = geometries.find((item) => item.tripCode === "541");
    const route542 = geometries.find((item) => item.tripCode === "542");

    expect(route541?.meetingPoints.map((item) => item.code)).toEqual([
      "PE01",
      "PE02",
    ]);
    expect(route542?.meetingPoints.map((item) => item.code)).toEqual([
      "COLEGIO",
      "PE01",
      "PE02",
    ]);
    expect(route542?.meetingPoints[0].order).toBe(1);
    expect(route542?.meetingPoints[2].order).toBe(3);
    expect(route542?.destination.name).toBe("PE02");
  });
});
