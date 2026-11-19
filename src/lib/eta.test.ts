import { describe, expect, it } from "vitest";
import { lineLength } from "./geo";
import { estimateArrival, remainingRouteDistance } from "./eta";

const straightLine = [
  { lat: 4.6, lng: -74.1 },
  { lat: 4.6, lng: -74.101 },
  { lat: 4.6, lng: -74.102 },
];

describe("remainingRouteDistance", () => {
  it("starts with the whole line ahead", () => {
    const result = remainingRouteDistance(straightLine, straightLine[0]);
    expect(result).not.toBeNull();
    expect(result?.remainingM).toBeCloseTo(lineLength(straightLine), 0);
  });

  it("splits the line at its middle vertex", () => {
    const result = remainingRouteDistance(straightLine, straightLine[1]);
    expect(result).not.toBeNull();
    expect(result?.remainingM).toBeCloseTo(lineLength(straightLine) / 2, 0);
  });

  it("returns null when there is no line", () => {
    expect(
      remainingRouteDistance([straightLine[0]], straightLine[0]),
    ).toBeNull();
  });

  it("measures the distance to an off-route point", () => {
    const result = remainingRouteDistance(straightLine, {
      lat: 4.601,
      lng: -74.101,
    });
    expect(result?.distanceToRouteM).toBeGreaterThan(100);
  });
});

describe("estimateArrival", () => {
  it("uses the configured speed for the remaining distance", () => {
    const result = estimateArrival(straightLine, straightLine[0], 10, 1_000);
    expect(result).not.toBeNull();
    const seconds = (result!.eta.getTime() - 1_000) / 1000;
    const expected = lineLength(straightLine) / ((10 * 1000) / 3600);
    expect(seconds).toBeCloseTo(expected, 0);
  });

  it("does not estimate with an invalid speed", () => {
    expect(estimateArrival(straightLine, straightLine[0], 0)).toBeNull();
  });

  it("does not estimate from far away from the route", () => {
    expect(
      estimateArrival(straightLine, { lat: 4.61, lng: -74.1 }, 10),
    ).toBeNull();
  });
});
