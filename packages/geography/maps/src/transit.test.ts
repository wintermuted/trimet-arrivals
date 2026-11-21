import { Map as MapboxMap } from "mapbox-gl";
import { removeRoutes, setRoutes, showNearbyRouteLines } from "./transit";
import type { RouteGeometryLoader } from "./transit";

jest.mock("mapbox-gl", () => {
  const MapMock = jest.fn();
  return {
    Map: MapMock,
    configureMocks() {
      const sources = new Set<string>();
      const layers = new Set<string>();
      const map = {
        addSource: jest.fn(id => { sources.add(id); return map; }),
        addLayer: jest.fn(({ id }) => { layers.add(id); return map; }),
        getSource: jest.fn(id => sources.has(id)),
        getLayer: jest.fn(id => layers.has(id)),
        removeLayer: jest.fn(id => { layers.delete(id); return map; }),
        removeSource: jest.fn(id => { sources.delete(id); return map; })
      };
      MapMock.mockImplementation(() => map);
    }
  };
});

describe("transit geometry provider boundary", () => {
  let map: jest.Mocked<MapboxMap>;
  let load: jest.MockedFunction<RouteGeometryLoader>;
  const feature = {
    type: "Feature" as const, properties: { route_number: 54, direction: 1 },
    geometry: { type: "LineString" as const, coordinates: [[0, 0], [1, 1]] }
  };
  beforeEach(() => {
    jest.requireMock("mapbox-gl").configureMocks();
    map = jest.mocked(new MapboxMap({ container: document.createElement("div") }));
    load = jest.fn().mockResolvedValue(feature);
  });

  it("deduplicates nearby directions and prevents late geometry from reinstalling closed layers", async () => {
    let finish: (value: typeof feature) => void;
    load.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const close = showNearbyRouteLines(map, { 54: { directions: [1, 1] } }, load);
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith("54", 1, expect.any(AbortSignal));
    close();
    expect(load.mock.calls[0][2].aborted).toBe(true);
    finish(feature);
    await Promise.resolve();
    await Promise.resolve();
    expect(map.addSource).not.toHaveBeenCalled();
  });

  it("preserves usable route geometry when one injected request fails and removes its source with its layer", async () => {
    const error = new Error("Route unavailable");
    const report = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      load.mockRejectedValueOnce(error);
      const ids = await setRoutes(map, { 54: { directions: [0, 1] } }, load);
      expect(ids).toEqual(["route-54_1"]);
      expect(report).toHaveBeenCalledWith(error);
      expect(map.addSource).toHaveBeenCalledWith("route-54_1", {
        type: "geojson", data: { type: "Feature", properties: {}, geometry: feature.geometry }
      });
      removeRoutes(map, ids);
      expect(map.removeLayer).toHaveBeenCalledWith("route-54_1");
      expect(map.removeSource).toHaveBeenCalledWith("route-54_1");
    } finally {
      report.mockRestore();
    }
  });

  it("propagates rendering failures rather than returning a success-shaped empty route set", async () => {
    map.addLayer.mockImplementationOnce(() => { throw new Error("Layer unavailable"); });
    await expect(setRoutes(map, { 54: { directions: [1] } }, load)).rejects.toThrow("Layer unavailable");
    expect(map.removeSource).toHaveBeenCalledWith("route-54_1");
  });
});
