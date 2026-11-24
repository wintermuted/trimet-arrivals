import { vi, type Mocked } from "vitest";
import { act } from "react";
import { LngLatBounds, Map as MapboxMap, Marker, Popup } from "mapbox-gl";
import { DirectionsSelection, highlightDirectionsStop, showDirectionsSelection } from "../view/nearby/util/mapbox/directionsSelection";
import { setRoutes } from "../view/nearby/util/mapbox/routeLines";

vi.mock("mapbox-gl", () => {
  const createMap = function () { return {
    getContainer: vi.fn().mockReturnValue({ clientWidth: 800, clientHeight: 400 }),
    getCanvas: vi.fn().mockReturnValue(global.document.createElement("canvas")),
    getCenter: vi.fn().mockReturnValue({ lng: 0, lat: 0 }),
    getZoom: vi.fn().mockReturnValue(14),
    getLayoutProperty: vi.fn().mockReturnValue("visible"),
    setLayoutProperty: vi.fn(),
    fitBounds: vi.fn(),
    flyTo: vi.fn(),
    jumpTo: vi.fn(),
    loaded: vi.fn().mockReturnValue(true),
    on: vi.fn(),
    off: vi.fn(),
    setPaintProperty: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    moveLayer: vi.fn(),
    getLayer: vi.fn().mockReturnValue({ id: "directions-route" }),
    getSource: vi.fn().mockReturnValue({ type: "geojson" }),
    removeLayer: vi.fn(),
    removeSource: vi.fn()
  }; };
  const createBounds = function () { return {
    extend: vi.fn().mockReturnThis(),
    isEmpty: vi.fn().mockReturnValue(false)
  }; };
  const createMarker = function () { return {
    setLngLat: vi.fn().mockReturnThis(),
    setPopup: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    getElement: vi.fn().mockReturnValue(global.document.createElement("div")),
    remove: vi.fn()
  }; };
  const createPopup = function () { return {
    addTo: vi.fn().mockReturnThis(),
    getElement: vi.fn(() => global.document.createElement("div")),
    on: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    setDOMContent: vi.fn().mockReturnThis(),
    setHTML: vi.fn().mockReturnThis(),
    setLngLat: vi.fn().mockReturnThis(),
    setText: vi.fn().mockReturnThis()
  }; };
  const mocks = {
    Map: vi.fn(),
    LngLatBounds: vi.fn(),
    Marker: vi.fn(),
    Popup: vi.fn()
  };
  return {
    ...mocks,
    default: mocks,
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

describe("Directions route geometry and endpoint framing", () => {
  const originalFetch = global.fetch;
  let map: Mocked<MapboxMap>;
  const onError = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    (await vi.importMock("mapbox-gl")).configureMocks();
    map = vi.mocked(new MapboxMap({ container: document.createElement("div") }));
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => geometry });
  });

  afterEach(() => {
    global.fetch = originalFetch;
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
    const bounds = vi.mocked(LngLatBounds).mock.results[0].value;
    expect(bounds.extend).toHaveBeenCalledWith([2, 1]);
    expect(map.fitBounds).toHaveBeenCalledWith(bounds, {
      padding: { top: 48, bottom: 48, left: 48, right: 48 },
      maxZoom: 16,
      duration: 500
    });
    expect(map.flyTo).not.toHaveBeenCalled();
    expect(Marker).toHaveBeenCalledTimes(2);
    const markers = vi.mocked(Marker).mock.results.map(result => result.value);
    expect(markers[0].setLngLat).toHaveBeenCalledWith([0, 0]);
    expect(markers[1].setLngLat).toHaveBeenCalledWith([2, 1]);
    expect(vi.mocked(Popup).mock.results[0].value.setText).toHaveBeenCalledWith("Board at: Example First (101)");
    expect(vi.mocked(Popup).mock.results[1].value.setText).toHaveBeenCalledWith("Get off at: Example Last (103)");
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

  it("shows downstream stops and fits the route from boarding to the terminus", async () => {
    const middle = { ...selection.destination, locid: 102, seq: 20, lng: 1, lat: 0 };
    const destinationStops = [middle, middle, selection.destination];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ...geometry,
        geometry: {
          coordinates: [[-1, 0], ...geometry.geometry.coordinates, [3, 1]],
          type: "LineString"
        }
      })
    });
    let close: () => void;
    await act(async () => {
      close = showDirectionsSelection(map, {
        ...selection,
        destination: undefined,
        destinationStops
      }, onError);
    });
    const stopSource = map.addSource.mock.calls.find(([id]) => id === "directions-stops")[1];
    expect(stopSource).toEqual({
      data: {
        features: [middle, selection.destination].map(stop => ({
          geometry: { coordinates: [stop.lng, stop.lat], type: "Point" },
          properties: {
            color: "#4264fb",
            locid: stop.locid
          },
          type: "Feature"
        })),
        type: "FeatureCollection"
      },
      type: "geojson"
    });
    expect(map.addSource).toHaveBeenCalledWith("directions-route", expect.objectContaining({
      data: expect.objectContaining({ geometry: geometry.geometry })
    }));
    expect(map.moveLayer).toHaveBeenCalledWith("directions-route", "directions-stops");
    const bounds = vi.mocked(LngLatBounds).mock.results[0].value;
    expect(bounds.extend).toHaveBeenCalledWith([2, 1]);
    expect(bounds.extend).not.toHaveBeenCalledWith([-1, 0]);
    expect(bounds.extend).not.toHaveBeenCalledWith([3, 1]);
    expect(map.fitBounds).toHaveBeenLastCalledWith(bounds, expect.anything());
    expect(map.flyTo).not.toHaveBeenCalled();
    expect(Marker).toHaveBeenCalledTimes(1);
    expect(vi.mocked(Marker).mock.results[0].value.setLngLat).toHaveBeenCalledWith([0, 0]);
    close();
    expect(map.removeLayer).toHaveBeenCalledWith("directions-stops");
    expect(map.removeSource).toHaveBeenCalledWith("directions-stops");
  });

  it("shows only the two endpoint pins and the selected segment once a destination is chosen", async () => {
    const middle = { ...selection.destination, locid: 102, seq: 20, lng: 1, lat: 0 };
    await act(async () => showDirectionsSelection(map, {
      ...selection,
      destination: middle,
      destinationStops: [middle, selection.destination]
    }, onError));

    expect(map.addSource).not.toHaveBeenCalledWith("directions-stops", expect.anything());
    expect(map.addSource).toHaveBeenCalledWith("directions-route", expect.objectContaining({
      data: expect.objectContaining({ geometry: { type: "LineString", coordinates: [[0, 0], [1, 0]] } })
    }));
    expect(vi.mocked(Marker).mock.results.map(({ value }) => value.setLngLat.mock.calls[0][0]))
      .toEqual([[0, 0], [1, 0]]);
    expect(vi.mocked(LngLatBounds).mock.results[0].value.extend).not.toHaveBeenCalledWith([2, 1]);
  });

  it("highlights and restores a stop without refetching geometry or moving the camera", async () => {
    await act(async () => showDirectionsSelection(map, {
      ...selection, showDestinationChoices: true, destinationStops: [selection.destination]
    }, onError));
    expect(map.addSource).toHaveBeenCalledWith("directions-stops", expect.objectContaining({
      data: expect.objectContaining({ features: [expect.objectContaining({
        properties: { locid: 103, color: "#c55316" }
      })] })
    }));
    const fits = map.fitBounds.mock.calls.length;
    highlightDirectionsStop(map, 103);
    expect(map.setPaintProperty).toHaveBeenCalledWith(
      "directions-stops", "circle-color",
      ["case", ["==", ["get", "locid"], 103], "#ff0000", ["get", "color"]]
    );
    expect(map.setPaintProperty).toHaveBeenCalledWith(
      "directions-stops", "circle-radius",
      ["case", ["==", ["get", "locid"], 103], 12, 8]
    );
    highlightDirectionsStop(map);
    expect(map.setPaintProperty).toHaveBeenCalledWith("directions-stops", "circle-color", ["get", "color"]);
    expect(map.setPaintProperty).toHaveBeenLastCalledWith("directions-stops", "circle-radius", 8);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(map.fitBounds).toHaveBeenCalledTimes(fits);
    expect(map.flyTo).not.toHaveBeenCalled();
    map.getLayer.mockReturnValue(undefined);
    map.setPaintProperty.mockClear();
    highlightDirectionsStop(map, 103);
    expect(map.setPaintProperty).not.toHaveBeenCalled();
  });

  it("shows and fits the remaining route even before a destination is chosen", async () => {
    const fullGeometry = {
      ...geometry,
      geometry: { type: "LineString", coordinates: [[-1, 0], ...geometry.geometry.coordinates, [3, 1]] }
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => fullGeometry });
    await act(async () => showDirectionsSelection(map, {
      ...selection,
      destination: undefined,
      destinationStops: [selection.destination]
    }, onError));
    expect(map.addSource).toHaveBeenCalledWith("directions-route", expect.objectContaining({
      data: expect.objectContaining({ geometry: geometry.geometry })
    }));
    const bounds = vi.mocked(LngLatBounds).mock.results[0].value;
    expect(bounds.extend).not.toHaveBeenCalledWith([-1, 0]);
    expect(bounds.extend).not.toHaveBeenCalledWith([3, 1]);
    expect(map.fitBounds).toHaveBeenCalled();
    expect(map.flyTo).not.toHaveBeenCalled();
  });

  it("does not display upstream route geometry when boarding at the terminus", async () => {
    await act(async () => showDirectionsSelection(map, {
      ...selection,
      origin: selection.destination,
      destination: undefined,
      destinationStops: []
    }, onError));
    const source = map.addSource.mock.calls.find(([id]) => id === "directions-route")[1];
    expect(source.data.geometry.coordinates).toEqual([[2, 1], [2, 1]]);
    const stopSource = map.addSource.mock.calls.find(([id]) => id === "directions-stops")[1];
    expect(stopSource.data.features).toEqual([]);
    const bounds = vi.mocked(LngLatBounds).mock.results[0].value;
    expect(bounds.extend).not.toHaveBeenCalledWith([0, 0]);
  });

  it("removes choosing markers and ignores a late route response after cancellation", async () => {
    let resolveFetch: (response: object) => void;
    global.fetch = vi.fn().mockImplementation(() => new Promise(resolve => { resolveFetch = resolve; }));
    const close = showDirectionsSelection(map, {
      ...selection, destination: undefined, destinationStops: [selection.destination]
    }, onError);
    expect(map.flyTo).not.toHaveBeenCalled();
    close();
    await act(async () => resolveFetch({ ok: true, json: async () => geometry }));
    expect(map.removeSource).toHaveBeenCalledWith("directions-stops");
    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("draws a solid selected route and includes intervening road bends in the fitted bounds", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ...geometry,
        geometry: { type: "LineString", coordinates: [[0, 0], [0, -2], [2, -2], [2, 1]] }
      })
    });
    await act(async () => showDirectionsSelection(map, selection, onError));
    const bounds = vi.mocked(LngLatBounds).mock.results[0].value;
    expect(bounds.extend).toHaveBeenCalledWith([0, -2]);
    expect(bounds.extend).toHaveBeenCalledWith([2, -2]);
    expect(map.fitBounds).toHaveBeenLastCalledWith(bounds, expect.anything());
    const layer = map.addLayer.mock.calls[0][0];
    expect(layer).toEqual(expect.objectContaining({
      paint: { "line-color": "#0080ff", "line-opacity": 1, "line-width": 4 }
    }));
  });

  it("loads existing line GeometryCollections without discarding their parts", async () => {
    global.fetch = vi.fn().mockResolvedValue({
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
    global.fetch = vi.fn().mockImplementation(() => new Promise(resolve => { resolveFetch = resolve; }));
    const close = showDirectionsSelection(map, selection, onError);
    const signal = vi.mocked(global.fetch).mock.calls[0][1].signal;
    close();
    expect(signal.aborted).toBe(true);
    vi.mocked(Marker).mock.results.forEach(result => {
      expect(result.value.remove).toHaveBeenCalledTimes(1);
    });
    await act(async () => resolveFetch({ ok: true, json: async () => geometry }));
    expect(map.addSource).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it.each([404, "invalid geometry"])("reports %s without drawing a false route", async failure => {
    global.fetch = vi.fn().mockResolvedValue({
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
    vi.mocked(global.fetch)
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
