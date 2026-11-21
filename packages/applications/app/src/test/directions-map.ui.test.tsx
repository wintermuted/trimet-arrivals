import { act } from "react";
import { LngLatBounds, Map as MapboxMap, Marker, Popup } from "mapbox-gl";
import { DirectionsSelection, highlightDirectionsStop, showDirectionsSelection } from "../view/nearby/util/mapbox/directionsSelection";
import { setRoutes } from "../view/nearby/util/mapbox/routeLines";
import { highlightNearbyStop, removeStopLocationLayers, setNearbyStops, showStopDetailMarker, updateStopMarkerColor } from "../view/nearby/util/mapbox/stopLocationMarker.util";
import { setCurrentLocationMarker } from "../view/nearby/util/mapbox/currentLocation";
import { showWalkingRoute } from "../view/nearby/util/mapbox/walkingRoute";
import { highlightRouteInfoStop, showRouteInfo } from "../view/nearby/util/mapbox/routeInfo";

jest.mock("!mapbox-gl", () => jest.requireMock("mapbox-gl"), { virtual: true });

jest.mock("mapbox-gl", () => {
  const createMap = () => ({
    getContainer: jest.fn().mockReturnValue({ clientWidth: 800, clientHeight: 400 }),
    getCanvas: jest.fn().mockReturnValue(global.document.createElement("canvas")),
    getCenter: jest.fn().mockReturnValue({ lng: 0, lat: 0 }),
    getZoom: jest.fn().mockReturnValue(14),
    getLayoutProperty: jest.fn().mockReturnValue("visible"),
    setLayoutProperty: jest.fn(),
    fitBounds: jest.fn(),
    flyTo: jest.fn(),
    jumpTo: jest.fn(),
    loaded: jest.fn().mockReturnValue(true),
    on: jest.fn(),
    off: jest.fn(),
    setPaintProperty: jest.fn(),
    addSource: jest.fn(),
    addLayer: jest.fn(),
    moveLayer: jest.fn(),
    getLayer: jest.fn().mockReturnValue({ id: "directions-route" }),
    getSource: jest.fn().mockReturnValue({ type: "geojson" }),
    removeLayer: jest.fn(),
    removeSource: jest.fn()
  });
  const createBounds = () => ({
    extend: jest.fn().mockReturnThis(),
    isEmpty: jest.fn().mockReturnValue(false)
  });
  const createMarker = () => ({
    setLngLat: jest.fn().mockReturnThis(),
    setPopup: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    getElement: jest.fn().mockReturnValue(global.document.createElement("div")),
    remove: jest.fn()
  });
  const createPopup = () => ({
    addTo: jest.fn().mockReturnThis(),
    getElement: jest.fn(() => global.document.createElement("div")),
    on: jest.fn().mockReturnThis(),
    remove: jest.fn().mockReturnThis(),
    setDOMContent: jest.fn().mockReturnThis(),
    setHTML: jest.fn().mockReturnThis(),
    setLngLat: jest.fn().mockReturnThis(),
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

  it("opens a downstream stop popover on hover and chooses the exact destination", async () => {
    const stop = { ...selection.destination, desc: "<Example stop>" };
    const onChooseDestination = jest.fn();
    const close = showDirectionsSelection(map, {
      ...selection, destination: undefined, destinationStops: [stop], onChooseDestination
    }, onError);
    const hover = map.on.mock.calls.find(([event, layer]) => event === "mousemove" && layer === "directions-stops")[2];
    hover({ features: [{ properties: { locid: selection.origin.locid } }] } as Parameters<typeof hover>[0]);
    expect(Popup).toHaveBeenCalledTimes(1); // Boarding marker only.
    hover({ features: [{ properties: { locid: stop.locid } }] } as Parameters<typeof hover>[0]);
    const popup = jest.mocked(Popup).mock.results[1].value;
    const content = popup.setDOMContent.mock.calls[0][0] as HTMLElement;
    expect(content.querySelector("strong")?.textContent).toBe("<Example stop>");
    expect(content.textContent).toContain("Stop ID: 103");
    content.querySelector("button")?.click();
    expect(onChooseDestination).toHaveBeenCalledWith(stop);
    expect(popup.remove).toHaveBeenCalled();
    close();
    expect(map.off).toHaveBeenCalledWith("mousemove", "directions-stops", hover);
    await act(async () => {});
  });

  it("shows a selected-stop marker and its popup independently of nearby markers, then removes both", () => {
    const close = showStopDetailMarker(map, {
      id: 8455, desc: "<Example stop>", dir: "E", lat: 2, lng: 1, passengerCode: "E"
    });
    expect(map.addSource).toHaveBeenCalledWith("stop-detail-marker", expect.objectContaining({
      data: expect.objectContaining({
        geometry: { type: "Point", coordinates: [1, 2] },
        properties: { locid: 8455 }
      })
    }));
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: "stop-detail-marker", source: "stop-detail-marker"
    }));
    const popup = jest.mocked(Popup).mock.results[0].value;
    expect(Popup).toHaveBeenCalledWith(expect.objectContaining({
      closeButton: false, closeOnClick: false, offset: 10
    }));
    expect(popup.setLngLat).toHaveBeenCalledWith([1, 2]);
    expect(popup.setText).toHaveBeenCalledWith("<Example stop>\nStop ID: 8455");
    expect(popup.setHTML).not.toHaveBeenCalled();
    expect(popup.addTo).toHaveBeenCalledWith(map);
    close();
    expect(popup.remove).toHaveBeenCalledTimes(1);
    expect(map.removeLayer).toHaveBeenCalledWith("stop-detail-marker");
    expect(map.removeSource).toHaveBeenCalledWith("stop-detail-marker");
  });

  it("removes the selected-stop source if its marker layer cannot be created", () => {
    map.addLayer.mockImplementationOnce(() => { throw new Error("Map unavailable"); });
    expect(() => showStopDetailMarker(map, {
      id: 8455, desc: "Example stop", dir: "E", lat: 2, lng: 1, passengerCode: "E"
    })).toThrow("Map unavailable");
    expect(map.removeSource).toHaveBeenCalledWith("stop-detail-marker");
  });

  it("removes marker resources if the stop popup cannot be created", () => {
    jest.mocked(Popup).mockImplementationOnce(() => { throw new Error("Popup unavailable"); });
    expect(() => showStopDetailMarker(map, {
      id: 8455, desc: "Example stop", dir: "E", lat: 2, lng: 1, passengerCode: "E"
    })).toThrow("Popup unavailable");
    expect(map.removeLayer).toHaveBeenCalledWith("stop-detail-marker");
    expect(map.removeSource).toHaveBeenCalledWith("stop-detail-marker");
  });

  it("shows all directions and unique route stops, then restores nearby markers", async () => {
      const route = {
        route: 54, id: 54, desc: "Example", type: "bus", routeColor: "", routeSortOrder: 54,
        dir: [
          { dir: 0, desc: "Outbound", stop: [selection.origin, selection.destination] },
          { dir: 1, desc: "Inbound", stop: [selection.destination] }
        ]
      };
      let close: () => void;
      await act(async () => { close = showRouteInfo(map, route, onError); });
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(map.addSource).toHaveBeenCalledWith("route-info-stops", expect.objectContaining({
        data: expect.objectContaining({ features: expect.arrayContaining([
          expect.objectContaining({ properties: expect.objectContaining({ locid: 101 }) }),
          expect.objectContaining({ properties: expect.objectContaining({ locid: 103 }) })
        ]) })
      }));
      expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: "route-info-0" }));
      expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: "route-info-1" }));
      expect(map.setLayoutProperty).toHaveBeenCalledWith("stopLocationLayer", "visibility", "none");
      close();
      expect(map.removeLayer).toHaveBeenCalledWith("route-info-stops");
      expect(map.removeLayer).toHaveBeenCalledWith("route-info-0");
      expect(map.removeLayer).toHaveBeenCalledWith("route-info-1");
      expect(map.setLayoutProperty).toHaveBeenLastCalledWith("stopLocationLayer", "visibility", "visible");
      expect(map.jumpTo).toHaveBeenCalledWith(expect.objectContaining({ zoom: 14 }));
  });

  it("reports failed geometry and ignores late responses after the panel closes", async () => {
    let resolveGeometry: (value: any) => void;
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveGeometry = resolve; }));
    const route = {
      route: 54, id: 54, desc: "Example", type: "bus", routeColor: "", routeSortOrder: 54,
      dir: [
        { dir: 0, desc: "Outbound", stop: [selection.origin] },
        { dir: 1, desc: "Inbound", stop: [selection.destination] }
      ]
    };
    let close: () => void;
    await act(async () => { close = showRouteInfo(map, route, onError); });
    expect(onError).toHaveBeenCalledTimes(1);
    close();
    await act(async () => resolveGeometry({ ok: true, json: async () => geometry }));
    expect(map.addLayer).not.toHaveBeenCalledWith(expect.objectContaining({ id: "route-info-1" }));
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("highlights and restores the route-information stop marker", () => {
    highlightRouteInfoStop(map, 101);
    expect(map.setPaintProperty).toHaveBeenCalledWith(
      "route-info-stops", "circle-color",
      ["case", ["==", ["get", "locid"], 101], "#ff0000", "#4264fb"]
    );
    expect(map.setPaintProperty).toHaveBeenCalledWith(
      "route-info-stops", "circle-radius",
      ["case", ["==", ["get", "locid"], 101], 12, 6]
    );
    highlightRouteInfoStop(map);
    expect(map.setPaintProperty).toHaveBeenCalledWith("route-info-stops", "circle-color", "#4264fb");
    expect(map.setPaintProperty).toHaveBeenCalledWith("route-info-stops", "circle-radius", 6);
    map.setPaintProperty.mockClear();
    map.getLayer.mockReturnValueOnce(undefined);
    highlightRouteInfoStop(map, 101);
    expect(map.setPaintProperty).not.toHaveBeenCalled();
  });

  it("shows a safe tooltip for list and map hovers, navigates on click, and removes handlers", async () => {
    const route = {
      route: 54, id: 54, desc: "Example", type: "bus", routeColor: "", routeSortOrder: 54,
      dir: [{ dir: 0, desc: "Outbound", stop: [
        { ...selection.origin, desc: "<Example First>" }, selection.destination
      ] }]
    };
    const onStopClick = jest.fn();
    let close: () => void;
    await act(async () => { close = showRouteInfo(map, route, onError, onStopClick); });
    const popup = jest.mocked(Popup).mock.results[0].value;
    const handler = (name: string) => map.on.mock.calls.find(([event, layer]) =>
      event === name && layer === "route-info-stops")[2] as (event?: any) => void;
    const enter = handler("mouseenter");
    const move = handler("mousemove");
    const leave = handler("mouseleave");
    const click = handler("click");
    const event = (id: number) => ({ features: [{ properties: { locid: id } }], lngLat: { lng: 2 } });

    highlightRouteInfoStop(map, 101);
    expect(popup.setText).toHaveBeenLastCalledWith("<Example First>\nStop ID: 101\nRoute: 54");
    expect(popup.setHTML).not.toHaveBeenCalled();
    expect(popup.setLngLat).toHaveBeenLastCalledWith([0, 0]);
    enter(event(103));
    expect(popup.setText).toHaveBeenLastCalledWith("Example Last\nStop ID: 103\nRoute: 54");
    expect(map.setPaintProperty).toHaveBeenLastCalledWith(
      "route-info-stops", "circle-radius", ["case", ["==", ["get", "locid"], 103], 12, 6]
    );
    move(event(101));
    expect(popup.setText).toHaveBeenLastCalledWith("<Example First>\nStop ID: 101\nRoute: 54");
    leave();
    expect(popup.setText).toHaveBeenLastCalledWith("<Example First>\nStop ID: 101\nRoute: 54");
    highlightRouteInfoStop(map);
    expect(popup.remove).toHaveBeenCalled();
    click(event(103));
    click(event(999));
    expect(onStopClick).toHaveBeenCalledTimes(1);
    expect(onStopClick).toHaveBeenCalledWith(103);
    close();
    expect(map.off).toHaveBeenCalledWith("mouseenter", "route-info-stops", enter);
    expect(map.off).toHaveBeenCalledWith("mousemove", "route-info-stops", move);
    expect(map.off).toHaveBeenCalledWith("mouseleave", "route-info-stops", leave);
    expect(map.off).toHaveBeenCalledWith("click", "route-info-stops", click);
    expect(map.getCanvas().style.cursor).toBe("");
  });
  it("draws and cleans up only the walking overlay, preserving the bus route", () => {
    const close = showWalkingRoute(map, {
      geometry: { coordinates: [[0, 0], [0, 0.001], [0.001, 0.001]], type: "LineString" },
      properties: {}, type: "Feature"
    });
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: "walking-access-route",
      paint: expect.objectContaining({ "line-dasharray": [1, 2], "line-emissive-strength": 1 })
    }));
    expect(map.fitBounds).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      maxZoom: 16, padding: 40
    }));
    close();
    expect(map.removeLayer).toHaveBeenCalledWith("walking-access-route");
    expect(map.removeSource).toHaveBeenCalledWith("walking-access-route");
    expect(map.removeLayer).not.toHaveBeenCalledWith("directions-route");
    expect(map.removeSource).not.toHaveBeenCalledWith("directions-route");
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

  it("restores nearby marker colors and ignores highlights after the layer is removed", () => {
    updateStopMarkerColor(map, "102", "#ff0000");
    expect(map.setPaintProperty).toHaveBeenLastCalledWith(
      "stopLocationLayer", "circle-color",
      ["case", ["==", ["get", "locid"], 102], "#ff0000", "#4264fb"]
    );
    updateStopMarkerColor(map, undefined, "#ff0000");
    expect(map.setPaintProperty).toHaveBeenLastCalledWith("stopLocationLayer", "circle-color", "#4264fb");
    map.setPaintProperty.mockClear();
    map.getLayer.mockReturnValue(undefined);
    updateStopMarkerColor(map, "102", "#ff0000");
    expect(map.setPaintProperty).not.toHaveBeenCalled();
  });

  it("shares one tooltip between sidebar and map hover, restores focused stops and cleans up old listeners", () => {
    const stops = {
      101: { desc: "Example First", dir: "E", lat: 0, lng: 0, locid: 101, route: [] },
      102: { desc: "Example Next", dir: "E", lat: 1, lng: 1, locid: 102, route: [] }
    };
    setNearbyStops(map, stops, ["54", "12"], jest.fn());
    const popup = jest.mocked(Popup).mock.results[0].value;
    highlightNearbyStop(map, 101);
    expect(popup.setLngLat).toHaveBeenLastCalledWith([0, 0]);
    expect(popup.setHTML).toHaveBeenLastCalledWith(
      "<strong>Stop ID</strong>: 101<br><strong>Routes</strong>: 54, 12"
    );
    expect(popup.addTo).toHaveBeenLastCalledWith(map);
    const enter = map.on.mock.calls.find(([event]) => event === "mouseenter")[2];
    const leave = map.on.mock.calls.find(([event]) => event === "mouseleave")[2];
    enter({ features: [{ properties: { locid: 102 } }], lngLat: { lng: 1 } });
    expect(popup.setLngLat).toHaveBeenLastCalledWith([1, 1]);
    expect(popup.setHTML).toHaveBeenLastCalledWith(
      "<strong>Stop ID</strong>: 102<br><strong>Routes</strong>: 54, 12"
    );
    leave();
    expect(popup.setLngLat).toHaveBeenLastCalledWith([0, 0]);
    highlightNearbyStop(map);
    expect(popup.remove).toHaveBeenCalled();
    expect(map.flyTo).not.toHaveBeenCalled();
    expect(map.fitBounds).not.toHaveBeenCalled();

    removeStopLocationLayers(map);
    expect(map.off).toHaveBeenCalledWith("mouseenter", "stopLocationLayer", enter);
    expect(map.off).toHaveBeenCalledWith("mouseleave", "stopLocationLayer", leave);
    expect(map.off).toHaveBeenCalledWith("click", "stopLocationLayer", expect.any(Function));
    popup.addTo.mockClear();
    highlightNearbyStop(map, 101);
    expect(popup.addTo).not.toHaveBeenCalled();
    setNearbyStops(map, stops, ["54", "12"], jest.fn());
    highlightNearbyStop(map, 102);
    expect(jest.mocked(Popup).mock.results[1].value.addTo).toHaveBeenCalledWith(map);
    expect(popup.addTo).not.toHaveBeenCalled();
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

  it("shows downstream stops and fits the route from boarding to the terminus", async () => {
    const middle = { ...selection.destination, locid: 102, seq: 20, lng: 1, lat: 0 };
    const destinationStops = [middle, middle, selection.destination];
    global.fetch = jest.fn().mockResolvedValue({
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
    const bounds = jest.mocked(LngLatBounds).mock.results[0].value;
    expect(bounds.extend).toHaveBeenCalledWith([2, 1]);
    expect(bounds.extend).not.toHaveBeenCalledWith([-1, 0]);
    expect(bounds.extend).not.toHaveBeenCalledWith([3, 1]);
    expect(map.fitBounds).toHaveBeenLastCalledWith(bounds, expect.anything());
    expect(map.flyTo).not.toHaveBeenCalled();
    expect(Marker).toHaveBeenCalledTimes(1);
    expect(jest.mocked(Marker).mock.results[0].value.setLngLat).toHaveBeenCalledWith([0, 0]);
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
    expect(jest.mocked(Marker).mock.results.map(({ value }) => value.setLngLat.mock.calls[0][0]))
      .toEqual([[0, 0], [1, 0]]);
    expect(jest.mocked(LngLatBounds).mock.results[0].value.extend).not.toHaveBeenCalledWith([2, 1]);
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
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => fullGeometry });
    await act(async () => showDirectionsSelection(map, {
      ...selection,
      destination: undefined,
      destinationStops: [selection.destination]
    }, onError));
    expect(map.addSource).toHaveBeenCalledWith("directions-route", expect.objectContaining({
      data: expect.objectContaining({ geometry: geometry.geometry })
    }));
    const bounds = jest.mocked(LngLatBounds).mock.results[0].value;
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
    const bounds = jest.mocked(LngLatBounds).mock.results[0].value;
    expect(bounds.extend).not.toHaveBeenCalledWith([0, 0]);
  });

  it("removes choosing markers and ignores a late route response after cancellation", async () => {
    let resolveFetch: (response: object) => void;
    global.fetch = jest.fn().mockImplementation(() => new Promise(resolve => { resolveFetch = resolve; }));
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
