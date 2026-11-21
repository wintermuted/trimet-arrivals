import mapboxgl from "mapbox-gl";
import distance from "@turf/distance";
import { createThemedMap, initializeCurrentLocationMarker, setCurrentLocationMarker } from ".";
import type { MapTheme } from ".";

jest.mock("mapbox-gl", () => {
  const MapMock = jest.fn();
  return {
    __esModule: true,
    default: { Map: MapMock },
    configureMocks() {
      const listeners: Record<string, () => void> = {};
      let preset: string;
      const map = {
        on: jest.fn((name, listener) => { listeners[name] = listener; }),
        off: jest.fn((name, listener) => {
          if (listeners[name] === listener) delete listeners[name];
        }),
        getConfigProperty: jest.fn(() => preset),
        setConfigProperty: jest.fn((_scope, _name, value) => { preset = value; }),
        addSource: jest.fn(),
        addLayer: jest.fn(),
        remove: jest.fn(() => listeners.remove?.())
      };
      map.addLayer.mockImplementation(() => map);
      MapMock.mockImplementation(options => {
        preset = options.config.basemap.lightPreset;
        return map;
      });
      return { map, emit: (name: string) => listeners[name]?.() };
    }
  };
});

describe("map lifecycle primitives", () => {
  let preset: "day" | "night";
  let notify: () => void;
  const unsubscribe = jest.fn();
  let mock: { emit(name: string): void };
  const theme: MapTheme = {
    lightPreset: () => preset,
    subscribe(listener) { notify = listener; return unsubscribe; }
  };
  function create() {
    return createThemedMap({ container: document.createElement("div"), center: [0, 0], zoom: 12 }, theme);
  }
  beforeEach(() => {
    preset = "night";
    mock = jest.requireMock("mapbox-gl").configureMocks();
  });

  it("uses the injected theme at creation and applies changes only after style readiness", () => {
    const map = create();
    expect(mapboxgl.Map).toHaveBeenCalledWith(expect.objectContaining({
      config: { basemap: { lightPreset: "night" } }
    }));
    preset = "day";
    notify();
    expect(map.setConfigProperty).not.toHaveBeenCalled();
    mock.emit("style.load");
    expect(map.setConfigProperty).toHaveBeenLastCalledWith("basemap", "lightPreset", "day");
    preset = "night";
    notify();
    expect(map.setConfigProperty).toHaveBeenLastCalledWith("basemap", "lightPreset", "night");
    expect(mapboxgl.Map).toHaveBeenCalledTimes(1);
    map.remove();
  });

  it("releases theme and style listeners on removal", () => {
    const map = create();
    mock.emit("style.load");
    map.remove();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(map.off).toHaveBeenCalledWith("style.load", expect.any(Function));
    preset = "day";
    mock.emit("style.load");
    expect(map.setConfigProperty).not.toHaveBeenCalled();
  });

  it("preserves the position point and a feet-based radius polygon with existing layer IDs", () => {
    const map = create();
    expect(setCurrentLocationMarker(map, -122.6, 45.5, 1000)).toBe(map);
    expect(map.addSource).toHaveBeenCalledWith("currentLocationCircle", {
      type: "geojson",
      data: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [-122.6, 45.5] } }
    });
    expect(map.addSource).toHaveBeenCalledWith("currentLocationRadius", expect.objectContaining({
      type: "geojson",
      data: expect.objectContaining({ geometry: expect.objectContaining({ type: "Polygon" }) })
    }));
    const radiusSource = jest.mocked(map.addSource).mock.calls[1][1];
    if (radiusSource.type !== "geojson" || typeof radiusSource.data === "string" ||
        radiusSource.data.type !== "Feature" || radiusSource.data.geometry.type !== "Polygon") {
      throw new Error("Expected a search-radius polygon");
    }
    const edge = radiusSource.data.geometry.coordinates[0][0];
    expect(distance([-122.6, 45.5], edge, { units: "feet" })).toBeCloseTo(1000, 4);
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: "currentLocationCircleLayer", source: "currentLocationCircle", type: "circle"
    }));
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: "currentLocationRadiusLayer", source: "currentLocationRadius", type: "fill"
    }));
    map.remove();
  });

  it("waits for map load before adding current-location layers", () => {
    const map = create();
    expect(initializeCurrentLocationMarker(map, -122.6, 45.5, 1000)).toBe(map);
    expect(map.addSource).not.toHaveBeenCalled();
    mock.emit("load");
    expect(map.addSource).toHaveBeenCalledTimes(2);
    map.remove();
  });
});
