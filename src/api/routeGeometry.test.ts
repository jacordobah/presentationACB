import { describe, expect, it } from "vitest";
import { tripCodesFromRoute } from "./routeGeometry";

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
