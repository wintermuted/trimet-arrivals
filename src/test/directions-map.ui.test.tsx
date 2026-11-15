import { act } from "react";
import { LngLatBounds, Map as MapboxMap, Marker, Popup } from "mapbox-gl";
import { DirectionsSelection, showDirectionsSelection } from "../view/nearby/util/mapbox/directionsSelection";
import { setRoutes } from "../view/nearby/util/mapbox/routeLines";
import { setNearbyStops, updateStopMarkerColor } from "../view/nearby/util/mapbox/stopLocationMarker.util";
import { setCurrentLocationMarker } from "../view/nearby/util/mapbox/currentLocation";

jest.mock("!mapbox-gl", () => jest.requireMock("mapbox-gl"), { virtual: true });

jest.mock("mapbox-gl", () => {
  const createMap = () => ({
    getContainer: jest.fn().mockReturnValue({ clientWidth: 800, clientHeight: 400 }),
    fitBounds: jest.fn(),
    flyTo: jest.fn(),
    loaded: jest.fn().mockReturnValue(true),
    on: jest.fn(),
    setPaintProperty: jest.fn(),
    addSource: jest.fn(),
    addLayer: jest.fn(),
    getLayer: jest.fn().mockReturnValue({ id: "directions-route" }),
    getSource: jest.fn().mockReturnValue({ type: "geojson" }),
    removeLayer: jest.fn(),
    removeSource: jest.fn()
  });
  const createBounds = () => ({
    extend: jest.fn().mockReturnThis()
  });
  const createMarker = () => ({
    setLngLat: jest.fn().mockReturnThis(),
    setPopup: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    getElement: jest.fn().mockReturnValue(global.document.createElement("div")),
    remove: jest.fn()
  });
  const createPopup = () => ({
    setText: jest.fn().mockReturnThis()
  });
  const mocks = {
    Map: jest.fn(),
    LngLatBounds: jest.fn(),
    Marker: jest.fn(),
    Popup: jest.fn()
  };
  return {
    ...mocks,
    configureMocks() {
      mocks.Map.mockImplementation(createMap);
      mocks.LngLatBounds.mockImplementation(createBounds);
      mocks.Marker.mockImplementation(createMarker);
      mocks.Popup.mockImplementation(createPopup);
    }
  };
});

const selection: DirectionsSelection = {
  routeId: 54,
  direction: 1,
  origin: { locid: 101, seq: 10, desc: "Example First", dir: "E", tp: true, lat: 0, lng: 0 },
  destination: { locid: 103, seq: 30, desc: "Example Last", dir: "E", tp: true, lat: 1, lng: 2 }
};
const geometry = {
  type: "Feature",
  properties: { route_number: 54, direction: 1 },
  geometry: { type: "LineString", coordinates: [[0, 0], [1, 0], [2, 1]] }
};

describe("directions route line and endpoint framing", () => {
  const originalFetch = global.fetch;
  let map: jest.Mocked<MapboxMap>;
  const onError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.requireMock("mapbox-gl").configureMocks();
    map = jest.mocked(new MapboxMap({ container: document.createElement("div") }));
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => geometry });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it.each(["light", "dark"])("keeps stop and location colors independent of %s basemap lighting", theme => {
    const previousTheme = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = theme;
    try {
      setNearbyStops(map, {}, ["54"], jest.fn());
      updateStopMarkerColor(map, "368", "#ff0000");
      setCurrentLocationMarker(map, 0, 0, 1000);
      expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
        id: "stopLocationLayer",
        paint: expect.objectContaining({
          "circle-color": "#4264fb",
          "circle-stroke-color": "#ffffff",
          "circle-emissive-strength": 1
        })
      }));
      expect(map.setPaintProperty).toHaveBeenCalledWith(
        "stopLocationLayer", "circle-color",
        ["case", ["==", ["get", "locid"], 368], "#ff0000", "#4264fb"]
      );
      expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
        id: "currentLocationCircleLayer",
        paint: { "circle-emissive-strength": 1 }
      }));
    } finally {
      if (previousTheme === undefined) {
        delete document.documentElement.dataset.theme;
      } else {
        document.documentElement.dataset.theme = previousTheme;
      }
    }
  });

  it("draws actual route geometry and fits both labeled endpoint markers", async () => {
    let close: () => void;
    await act(async () => { close = showDirectionsSelection(map, selection, onError); });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/data/trimet/geoJSON/54/54_1.json"),
      { signal: expect.any(AbortSignal) }
    );
    expect(map.addSource).toHaveBeenCalledWith("directions-route", {
      type: "geojson",
      data: { type: "Feature", geometry: geometry.geometry, properties: {} }
    });
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: "directions-route", source: "directions-route", type: "line"
    }));
    expect(LngLatBounds).toHaveBeenCalledWith([0, 0], [0, 0]);
    const bounds = jest.mocked(LngLatBounds).mock.results[0].value;
    expect(bounds.extend).toHaveBeenCalledWith([2, 1]);
    expect(map.fitBounds).toHaveBeenCalledWith(bounds, {
      padding: { top: 48, bottom: 48, left: 48, right: 48 },
      maxZoom: 16,
      duration: 500
    });
    expect(map.flyTo).not.toHaveBeenCalled();
    expect(Marker).toHaveBeenCalledTimes(2);
    const markers = jest.mocked(Marker).mock.results.map(result => result.value);
    expect(markers[0].setLngLat).toHaveBeenCalledWith([0, 0]);
    expect(markers[1].setLngLat).toHaveBeenCalledWith([2, 1]);
    expect(jest.mocked(Popup).mock.results[0].value.setText).toHaveBeenCalledWith("Board at: Example First (101)");
    expect(jest.mocked(Popup).mock.results[1].value.setText).toHaveBeenCalledWith("Get off at: Example Last (103)");
    expect(onError).not.toHaveBeenCalled();
    close();
    expect(map.removeLayer).toHaveBeenCalledWith("directions-route");
    expect(map.removeSource).toHaveBeenCalledWith("directions-route");
  });

  it("limits padding for short mobile map panels", async () => {
    const container = document.createElement("div");
    Object.defineProperties(container, {
      clientWidth: { value: 300 },
      clientHeight: { value: 100 }
    });
    map.getContainer.mockReturnValue(container);
    await act(async () => showDirectionsSelection(map, selection, onError));
    expect(map.fitBounds).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      padding: { top: 45, bottom: 20, left: 48, right: 48 }
    }));
  });

  it("draws a solid selected route and includes intervening road bends in the fitted bounds", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ...geometry,
        geometry: { type: "LineString", coordinates: [[0, 0], [0, -2], [2, -2], [2, 1]] }
      })
    });
    await act(async () => showDirectionsSelection(map, selection, onError));
    const bounds = jest.mocked(LngLatBounds).mock.results[0].value;
    expect(bounds.extend).toHaveBeenCalledWith([0, -2]);
    expect(bounds.extend).toHaveBeenCalledWith([2, -2]);
    expect(map.fitBounds).toHaveBeenLastCalledWith(bounds, expect.anything());
    const layer = map.addLayer.mock.calls[0][0];
    expect(layer).toEqual(expect.objectContaining({
      paint: { "line-color": "#0080ff", "line-opacity": 1, "line-width": 4 }
    }));
  });

  it("loads existing line GeometryCollections without discarding their parts", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ...geometry,
        geometry: {
          type: "GeometryCollection",
          geometries: [
            { type: "LineString", coordinates: [[0, 0], [1, 0]] },
            { type: "LineString", coordinates: [[1, 0], [2, 1]] }
          ]
        }
      })
    });
    await act(async () => showDirectionsSelection(map, selection, onError));
    expect(onError).not.toHaveBeenCalled();
    expect(map.addSource).toHaveBeenCalledWith("directions-route", expect.objectContaining({
      data: expect.objectContaining({
        geometry: {
          type: "MultiLineString",
          coordinates: [[[0, 0], [1, 0]], [[1, 0], [2, 1]]]
        }
      })
    }));
  });

  it("focuses the boarding stop while a destination is still unselected", async () => {
    await act(async () => showDirectionsSelection(map, { ...selection, destination: undefined }, onError));
    expect(map.flyTo).toHaveBeenCalledWith({ center: [0, 0], zoom: 16 });
    expect(map.fitBounds).not.toHaveBeenCalled();
    expect(Marker).toHaveBeenCalledTimes(1);
    expect(map.addLayer).toHaveBeenCalledTimes(1);
  });

  it("removes its markers and route overlay and ignores responses after cleanup", async () => {
    let resolveFetch: (response: object) => void;
    global.fetch = jest.fn().mockImplementation(() => new Promise(resolve => { resolveFetch = resolve; }));
    const close = showDirectionsSelection(map, selection, onError);
    const signal = jest.mocked(global.fetch).mock.calls[0][1].signal;
    close();
    expect(signal.aborted).toBe(true);
    jest.mocked(Marker).mock.results.forEach(result => {
      expect(result.value.remove).toHaveBeenCalledTimes(1);
    });
    await act(async () => resolveFetch({ ok: true, json: async () => geometry }));
    expect(map.addSource).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it.each([404, "invalid geometry"])("reports %s without drawing a false route", async failure => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: failure !== 404,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ type: "FeatureCollection", features: [] })
    });
    await act(async () => showDirectionsSelection(map, selection, onError));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(map.addLayer).not.toHaveBeenCalled();
  });

  it("preserves other views' partial success when one route geometry is unavailable", async () => {
    jest.mocked(global.fetch)
      .mockResolvedValueOnce({ ok: false, status: 404, statusText: "Not Found" })
      .mockResolvedValueOnce({ ok: true, json: async () => geometry });
    const routes = await setRoutes(map, {
      12: { directions: [0] },
      54: { directions: [1] }
    });
    expect(routes).toEqual(["route-54_1"]);
    expect(map.addLayer).toHaveBeenCalledTimes(1);
  });
});
