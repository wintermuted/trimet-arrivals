import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useOutletContext } from "react-router-dom";
import getCurrentPosition from "../api/geolocation/getCurrentPosition";
import { getNearbyStops } from "../api/trimet/stops";
import { getArrivals } from "../api/trimet/arrivals";
import { getRouteById } from "../api/trimet/routeConfig";
import { StopData } from "../api/trimet/interfaces/types";
import { FeatureFlagsProvider, useFeatureFlags } from "../component/feature-flags/FeatureFlags";
import { getWalkingPath } from "../api/mapbox/walking";
import NearbyViewComponent, { NearbySimpleRoutesComp, NearbyStopDetailComponent, NearbyTripPlannerComponent, NearbyViewComponentOutletContextProps } from "../view/nearby/components/NearbyViewComponent";
import { setNearbyStops } from "../view/nearby/util/mapbox/stopLocationMarker.util";
import { showRouteInfo } from "../view/nearby/util/mapbox/routeInfo";
import { getStopCatalog } from "../api/trimet/stopCatalog";
import { planTrip } from "../api/trimet/tripplanner";
import { getRouteGeometry } from "../view/nearby/util/mapbox/routeLines";

jest.mock("../api/geolocation/getCurrentPosition");
jest.mock("../api/trimet/stops");
jest.mock("../api/trimet/arrivals");
jest.mock("../api/trimet/routeConfig");
jest.mock("../api/trimet/stopCatalog", () => ({
  ...jest.requireActual("../api/trimet/stopCatalog"),
  getStopCatalog: jest.fn(),
}));
jest.mock("../api/trimet/tripplanner");
jest.mock("../view/nearby/util/mapbox/routeLines", () => ({
  ...jest.requireActual("../view/nearby/util/mapbox/routeLines"),
  getRouteGeometry: jest.fn(),
}));
jest.mock("../api/mapbox/walking");
jest.mock("../view/nearby/util/mapbox/routeInfo", () => ({
  highlightRouteInfoStop: jest.fn(),
  showRouteInfo: jest.fn(),
}));
jest.mock("../view/nearby/util/mapbox/initializeMap", () => ({
  initializeMap: jest.fn(),
}));
jest.mock("../view/nearby/util/mapbox/currentLocation", () => ({
  initializeCurrentLocationMarker: jest.fn(),
  setCurrentLocationMarker: jest.fn(),
}));
jest.mock("../view/nearby/util/mapbox/stopLocationMarker.util", () => ({
  highlightNearbyStop: jest.fn(),
  removeCurrentLocationMarkers: jest.fn(),
  removeStopLocationLayers: jest.fn(),
  setNearbyStops: jest.fn(),
  showStopDetailMarker: jest.fn(() => jest.fn()),
  updateStopMarkerColor: jest.fn(),
}));
jest.mock("mapbox-gl", () => {
  const Marker = jest.fn();
  return {
    __esModule: true,
    default: { accessToken: "pk.synthetic-test-token", Marker },
    Marker,
    Popup: class {
      content: HTMLElement;
      close: () => void;
      setLngLat() { return this; }
      setDOMContent(content: HTMLElement) { this.content = content; return this; }
      on(_event: string, close: () => void) { this.close = close; return this; }
      addTo() { this.content.ownerDocument.body.appendChild(this.content); return this; }
      isOpen() { return this.content.isConnected; }
      remove() { this.content.remove(); this.close(); }
    },
    LngLatBounds: class {
      extend() { return this; }
    },
  };
});

const stops: StopData = {
  location: [
    {
      desc: "Example stop",
      dir: "E",
      lat: 0,
      lng: 0.001,
      locid: 101,
      route: [
        {
          desc: "Example route",
          dir: [{ desc: "To Example Destination", dir: 0 }],
          route: 56,
          type: "bus",
        },
      ],
    },
  ],
  queryTime: "",
};

function WalkingToggle() {
  const { walkingEnabled, setWalkingEnabled } = useFeatureFlags();
  return <button onClick={() => setWalkingEnabled(!walkingEnabled)}>Toggle walking estimates</button>;
}

describe("Nearby map initialization independently of the sidebar", () => {
  let container: HTMLDivElement;
  let root: Root;
  const sources = new Set<string>();
  const layers = new Set<string>();
  const map = {
    on: jest.fn(), remove: jest.fn(), resize: jest.fn(), flyTo: jest.fn(),
    getCenter: jest.fn(() => ({ lng: 1, lat: 2 })), setZoom: jest.fn(),
    getContainer: jest.fn(() => ({ clientWidth: 390, clientHeight: 230 })),
    fitBounds: jest.fn(), setFilter: jest.fn(), off: jest.fn(),
    queryRenderedFeatures: jest.fn(),
    addSource: jest.fn((id, _data) => sources.add(id)),
    addLayer: jest.fn(({ id }) => layers.add(id)),
    getSource: jest.fn(id => sources.has(id)),
    getLayer: jest.fn(id => layers.has(id)),
    removeLayer: jest.fn(id => layers.delete(id)),
    removeSource: jest.fn(id => sources.delete(id)),
  };
  const marker = {
    setLngLat: jest.fn(), addTo: jest.fn(), getLngLat: jest.fn(() => ({ lng: 3, lat: 4 })),
    on: jest.fn(), off: jest.fn(), remove: jest.fn()
  };
  const previousResizeObserver = global.ResizeObserver;

  beforeEach(() => {
    jest.clearAllMocks();
    sources.clear();
    layers.clear();
    map.getContainer.mockReturnValue({ clientWidth: 390, clientHeight: 230 });
    map.addSource.mockImplementation(id => sources.add(id));
    map.addLayer.mockImplementation(({ id }) => layers.add(id));
    map.getSource.mockImplementation(id => sources.has(id));
    map.getLayer.mockImplementation(id => layers.has(id));
    map.removeLayer.mockImplementation(id => layers.delete(id));
    map.removeSource.mockImplementation(id => sources.delete(id));
    map.getCenter.mockReturnValue({ lng: 1, lat: 2 });
    marker.getLngLat.mockReturnValue({ lng: 3, lat: 4 });
    marker.setLngLat.mockReturnValue(marker);
    marker.addTo.mockReturnValue(marker);
    jest.requireMock("mapbox-gl").default.Marker.mockImplementation(() => marker);
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      disconnect: jest.fn(),
      observe: jest.fn(),
    }));
    jest.mocked(getCurrentPosition).mockResolvedValue({
      coords: {
        accuracy: 1,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        latitude: 0,
        longitude: 0,
        speed: null,
      },
      timestamp: 0,
    });
    jest.mocked(getNearbyStops).mockResolvedValue(stops);
    jest.mocked(getArrivals).mockResolvedValue({
      arrival: [], detour: [], location: [], queryTime: ""
    });
    jest.mocked(getRouteById).mockResolvedValue({
      route: [{
        route: 56, id: 56, desc: "Example route", type: "bus",
        routeColor: "", routeSortOrder: 56,
        dir: [{ dir: 0, desc: "To Example Destination", stop: [
          { ...stops.location[0], seq: 1, tp: false }
        ] }]
      }]
    });
    jest.mocked(showRouteInfo).mockReturnValue(jest.fn());
    jest.requireMock("../view/nearby/util/mapbox/stopLocationMarker.util")
      .showStopDetailMarker.mockImplementation(() => jest.fn());
    jest
      .requireMock("../view/nearby/util/mapbox/initializeMap")
      .initializeMap.mockReturnValue(map);
    jest
      .requireMock("../view/nearby/util/mapbox/currentLocation")
      .initializeCurrentLocationMarker.mockReturnValue(map);
    jest
      .requireMock("../view/nearby/util/mapbox/stopLocationMarker.util")
      .setNearbyStops.mockReturnValue(map);
    jest
      .requireMock("../view/nearby/util/mapbox/stopLocationMarker.util")
      .removeStopLocationLayers.mockReturnValue(map);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    global.ResizeObserver = previousResizeObserver;
  });

  function render(path: string) {
    return act(async () =>
      root.render(
        <FeatureFlagsProvider>
          <WalkingToggle />
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/nearby" element={<NearbyViewComponent />}>
                <Route path="planner" element={<NearbyTripPlannerComponent />} />
                <Route path="stops/:id" element={<NearbyStopDetailComponent />} />
                <Route path="*" element={<p>Sidebar ready</p>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </FeatureFlagsProvider>
      )
    );
  }

  function finishMapLoading() {
    const listeners = map.on.mock.calls.filter(([event]) => event === "load");
    act(() => listeners[listeners.length - 1][1]());
  }

  function button(label: string) {
    return Array.from(container.querySelectorAll("button")).find(item =>
      item.textContent.includes(label) ||
      item.getAttribute("aria-label")?.includes(label) ||
      item.title.includes(label)
    );
  }

  it("opens the sidebar planner with the exact stop detail destination and no boarding stop", async () => {
    jest.mocked(getCurrentPosition).mockRejectedValueOnce(new Error("denied"));
    const stop = { desc: "Shared platform name", dir: "E", id: 8455, lat: 45.52, lng: -122.67, passengerCode: "E" };
    jest.mocked(getArrivals).mockResolvedValue({
      arrival: [], detour: [], queryTime: "", location: [stop]
    });
    jest.mocked(getStopCatalog).mockResolvedValue({
      stops: [8454, 8455].map(locid => ({
        ...stop, locid, aliases: [], seq: 1, tp: false,
      })),
      routeCount: 1, directionCount: 1, stopReferenceCount: 2,
      incompleteRouteCount: 0, incompleteDirectionCount: 0,
      incompleteRouteNames: [], invalidStopCount: 0,
    });

    await render("/nearby/stops/8455");
    expect(container.querySelector('[role="group"][aria-label="Filter departures by route"]')).not.toBeNull();
    expect(container.textContent).not.toContain("Routes serving this stop (filter departures)");
    const action = Array.from(container.querySelectorAll("a"))
      .find(link => link.textContent.trim() === "Plan a trip to this stop");
    expect(action.getAttribute("href")).toBe("/nearby/planner?to=8455");
    await act(async () => action.click());

    const [boarding, destination] = Array.from(container.querySelectorAll(".transit-planner-stop-select"));
    expect(boarding.textContent).toContain("Search by stop name or ID");
    expect(destination.textContent).toContain("Shared platform name (8455)");
    expect(button("Find trips").disabled).toBe(true);
    expect(planTrip).not.toHaveBeenCalled();
  });

  it("plans a deep-linked trip without geolocation and switches views without replacing the map", async () => {
    jest.mocked(getCurrentPosition).mockRejectedValueOnce(new Error("denied"));
    jest.mocked(getStopCatalog).mockResolvedValue({
      stops: [101, 202].map(locid => ({
        ...stops.location[0], locid, aliases: [], seq: 1, tp: false,
      })),
      routeCount: 1, directionCount: 1, stopReferenceCount: 2,
      incompleteRouteCount: 0, incompleteDirectionCount: 0,
      incompleteRouteNames: [], invalidStopCount: 0,
    });
    jest.mocked(planTrip).mockResolvedValue({
      success: true, partial: false, itineraries: [],
    });
    await render("/nearby/planner?from=101&to=202");
    const nav = container.querySelector('nav[aria-label="Nearby sidebar"]');
    const [explore, planner] = Array.from(nav.querySelectorAll("a"));
    const mapCanvas = container.querySelector(".transit-nearby-map-canvas");
    expect(planner.getAttribute("aria-current")).toBe("page");
    expect(getNearbyStops).not.toHaveBeenCalled();
    expect(planTrip).toHaveBeenCalledWith(
      expect.objectContaining({ fromPlace: "101", toPlace: "202" })
    );
    expect(container.textContent).toContain("No trips were found");
    expect(container.textContent).not.toContain("Choose any two TriMet stops");
    expect(container.textContent).not.toContain("Location unavailable");
    expect(mapCanvas).not.toBeNull();

    await act(async () => explore.click());
    expect(explore.getAttribute("aria-current")).toBe("location");
    expect(container.textContent).toContain("Location unavailable");
    expect(container.querySelector(".transit-planner")).toBeNull();
    expect(container.querySelector(".transit-nearby-map-canvas")).toBe(mapCanvas);
    expect(map.remove).not.toHaveBeenCalled();
  });

  it("draws available paths together, highlights the chosen option, and removes only planner paths on exit", async () => {
    const [origin, destination] = [101, 202].map((locid, index) => ({
      ...stops.location[0], locid, desc: `Stop ${locid}`, lng: index * 0.01,
      lat: 0, aliases: [], seq: index + 1, tp: false,
    }));
    jest.mocked(getStopCatalog).mockResolvedValue({
      stops: [origin, destination], routeCount: 2, directionCount: 2, stopReferenceCount: 2,
      incompleteRouteCount: 0, incompleteDirectionCount: 0,
      incompleteRouteNames: [], invalidStopCount: 0,
    });
    const branded = {
      100: { desc: "MAX Blue Line", type: "R", routeColor: "1359AE" },
      190: { desc: "MAX Yellow Line", type: "R", routeColor: "FFC52F" },
      290: { desc: "MAX Orange Line", type: "R", routeColor: "D05F27" },
      194: { desc: "Portland Streetcar - A Loop", type: "R", routeColor: "D91965" },
      2: { desc: "FX2-Division", type: "B", routeColor: "61A60E" }
    };
    jest.mocked(getRouteById).mockImplementation(async id => ({
      route: [{
        id, route: id, desc: "Test route", type: "B", routeColor: "4679AA", routeSortOrder: id,
        ...branded[id],
        dir: [{ dir: 0, desc: "Eastbound", stop: [origin, destination] }]
      }]
    }));
    jest.mocked(getRouteGeometry).mockImplementation(async id => {
      if (id === "45") throw new Error("No shape");
      if (id === "42") return {
        type: "Feature", properties: {},
        geometry: {
          type: "MultiLineString",
          coordinates: [[[0.01, 0], [0.005, 0.001]], [[0, 0], [0.005, 0.001]], [[0, 0], [0.005, 0.001]]]
        }
      };
      return {
        type: "Feature", properties: {},
        geometry: { type: "LineString", coordinates: [[0, 0], [0.005, Number(id) / 100000], [0.01, 0]] }
      };
    });
    jest.mocked(planTrip).mockResolvedValue({
      success: true, partial: false,
      itineraries: [42, 100, 45, 194, 2, 190, 290].map((id, index) => ({
        id: String(id), duration: 15 + index, partial: false,
        legs: [
          { mode: "Walk", partial: false, from: { lon: 0.01, lat: 0 }, to: { lon: 0.011, lat: 0.001 } },
          {
            mode: "Bus", partial: false, route: { internalNumber: id, number: String(id), name: `Test route ${id}` },
            from: { stopId: origin.locid, description: origin.desc, lon: origin.lng, lat: origin.lat },
            to: { stopId: destination.locid, description: destination.desc, lon: destination.lng, lat: destination.lat }
          },
          ...(id === 45 ? [{
            mode: "Bus", partial: false, route: { internalNumber: 46, number: "46", name: "Test route 46" },
            from: { stopId: destination.locid, description: destination.desc, lon: destination.lng, lat: destination.lat },
            to: { stopId: 303, description: "Stop 303", lon: 0.02, lat: 0 }
          }] : [])
        ]
      }))
    });

    await render("/nearby/planner?from=101&to=202");
    const Marker = jest.requireMock("mapbox-gl").Marker;
    await act(async () => finishMapLoading());
    expect(setNearbyStops).not.toHaveBeenCalled();
    expect(Marker).not.toHaveBeenCalled();
    expect(map.setFilter).toHaveBeenCalledWith("planner-itineraries-selected", ["all", ["==", ["get", "trip"], -1], ["==", ["get", "walk"], false]]);
    const chooseTrip = async (index: number) => {
      const edit = container.querySelector<HTMLButtonElement>(".transit-planner-results .transit-planner-edit");
      if (edit) act(() => edit.click());
      await act(async () => container.querySelectorAll<HTMLButtonElement>(".transit-planner-options button")[index].click());
    };
    await chooseTrip(0);
    expect(Marker).toHaveBeenCalledTimes(2);
    expect(Marker.mock.calls.map(([{ element }]) => element.getAttribute("aria-label"))).toEqual([
      "Board: Test route 42 at Stop 101",
      "Get off: Test route 42 at Stop 202"
    ]);
    const firstMarker: HTMLButtonElement = Marker.mock.calls[0][0].element;
    expect(firstMarker.tagName).toBe("BUTTON");
    firstMarker.click();
    expect(firstMarker.getAttribute("aria-expanded")).toBe("true");
    const popup = document.getElementById(firstMarker.getAttribute("aria-controls"));
    expect(popup.querySelector("strong").textContent).toBe("Stop 101");
    expect(popup.textContent).toContain("Stop ID: 101");
    expect(popup.textContent).toContain("Board: Test route 42");
    firstMarker.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(firstMarker.getAttribute("aria-expanded")).toBe("false");
    expect(popup.isConnected).toBe(false);
    firstMarker.click();
    const secondMarker: HTMLButtonElement = Marker.mock.calls[1][0].element;
    secondMarker.click();
    expect(firstMarker.getAttribute("aria-expanded")).toBe("false");
    expect(secondMarker.getAttribute("aria-expanded")).toBe("true");
    expect(popup.isConnected).toBe(false);
    firstMarker.click();
    expect(map.addSource).toHaveBeenCalledWith("planner-itineraries", expect.objectContaining({
      data: expect.objectContaining({
        features: [
          expect.objectContaining({
            properties: { trip: 0, legIndex: 1, walk: false, color: "#1559d1" },
            geometry: { type: "LineString", coordinates: [[0, 0], [0.005, 0.001], [0.01, 0]] }
          }),
          expect.objectContaining({ properties: { trip: 1, legIndex: 1, walk: false, color: "#1359AE" } }),
          expect.objectContaining({ properties: { trip: 3, legIndex: 1, walk: false, color: "#D91965" } }),
          expect.objectContaining({ properties: { trip: 4, legIndex: 1, walk: false, color: "#61A60E" } }),
          expect.objectContaining({ properties: { trip: 5, legIndex: 1, walk: false, color: "#FFC52F" } }),
          expect.objectContaining({ properties: { trip: 6, legIndex: 1, walk: false, color: "#D05F27" } })
        ]
      })
    }));
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: "planner-itineraries-selected",
      paint: expect.objectContaining({ "line-color": ["get", "color"], "line-width": 5 })
    }));
    expect(map.fitBounds).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ padding: 38 }));
    expect(container.querySelector("p.transit-planner-partial")).toBeNull();
    const [walkLeg, busLeg] = container.querySelectorAll<HTMLLIElement>(".transit-planner-leg");
    const highlighted = "transit-planner-leg--highlighted";
    const highlightFilter = (trip: number, leg: number) => ["all",
      ["==", ["get", "trip"], trip], ["==", ["get", "legIndex"], leg], ["==", ["get", "walk"], false]
    ];
    const highlightLayer = "planner-itineraries-selected-highlight";
    act(() => walkLeg.focus());
    expect(walkLeg.classList.contains(highlighted)).toBe(true);
    act(() => busLeg.focus());
    expect(map.setFilter).toHaveBeenCalledWith(highlightLayer, highlightFilter(0, 1));
    act(() => busLeg.blur());
    expect(map.setFilter).toHaveBeenLastCalledWith(`${highlightLayer}-walk`, expect.arrayContaining([["==", ["get", "legIndex"], -1]]));
    const move = map.on.mock.calls.filter(([event]) => event === "mousemove").pop()[1];
    const leave = map.on.mock.calls.filter(([event]) => event === "mouseout").pop()[1];
    map.queryRenderedFeatures.mockReturnValue([
      { properties: { trip: 1, legIndex: 0 } },
      { properties: { trip: 0, legIndex: 2 } },
      { properties: { trip: 0, legIndex: 1 } },
    ]);
    act(() => move({ point: { x: 10, y: 20 } }));
    expect(map.queryRenderedFeatures).toHaveBeenCalledWith({ x: 10, y: 20 }, {
      layers: ["planner-itineraries-selected", "planner-itineraries-selected-walk"]
    });
    expect(busLeg.classList.contains(highlighted)).toBe(true);
    act(() => leave());
    expect(busLeg.classList.contains(highlighted)).toBe(false);
    act(() => move({ point: { x: 10, y: 20 } }));
    await chooseTrip(1);
    expect(container.querySelector(`.${highlighted}`)).toBeNull();
    expect(map.off).toHaveBeenCalledWith("mousemove", move);
    expect(popup.isConnected).toBe(false);
    expect(marker.remove).toHaveBeenCalledTimes(2);
    expect(Marker.mock.calls.slice(-2).map(([{ element }]) => element.getAttribute("aria-label"))).toEqual([
      "Board: Test route 100 at Stop 101",
      "Get off: Test route 100 at Stop 202"
    ]);
    expect(map.setFilter).toHaveBeenCalledWith("planner-itineraries-selected", ["all", ["==", ["get", "trip"], 1], ["==", ["get", "walk"], false]]);
    expect(map.setFilter).toHaveBeenCalledWith("planner-itineraries-alternatives", ["all", ["!=", ["get", "trip"], 1], ["==", ["get", "walk"], false]]);
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    await chooseTrip(2);
    const transferMarker: HTMLButtonElement = Marker.mock.calls.slice(-2)[0][0].element;
    transferMarker.click();
    const transferPopup = document.getElementById(transferMarker.getAttribute("aria-controls"));
    expect(transferPopup.textContent).toContain("Stop ID: 202");
    expect(Array.from(transferPopup.querySelectorAll("li"), row => row.textContent))
      .toEqual(["Get off: Test route 45", "Board: Test route 46"]);
    expect(getWalkingPath).not.toHaveBeenCalled();
    const walkingGeometry = { type: "LineString" as const, coordinates: [[0.01, 0], [0.0105, 0], [0.011, 0.001]] };
    jest.mocked(getWalkingPath).mockResolvedValue({
      status: "ready", meters: 100, seconds: 80,
      feature: { type: "Feature", properties: {}, geometry: walkingGeometry }
    });
    await act(async () => button("Toggle walking estimates").click());
    expect(getWalkingPath).toHaveBeenCalledTimes(1);
    expect(getWalkingPath).toHaveBeenCalledWith([0.01, 0], [0.011, 0.001], expect.anything());
    expect(map.addSource).toHaveBeenLastCalledWith("planner-itineraries", expect.objectContaining({
      data: expect.objectContaining({
        features: expect.arrayContaining([expect.objectContaining({ properties: { trip: 2, legIndex: 0, walk: true }, geometry: walkingGeometry })])
      })
    }));
    expect(map.setFilter).toHaveBeenCalledWith("planner-itineraries-selected-walk", ["all", ["==", ["get", "trip"], 2], ["==", ["get", "walk"], true]]);
    await act(async () => button("Toggle walking estimates").click());
    expect(jest.mocked(getWalkingPath).mock.calls[0][2].aborted).toBe(true);
    expect(map.addSource).toHaveBeenLastCalledWith("planner-itineraries", expect.objectContaining({
      data: expect.objectContaining({
        features: expect.not.arrayContaining([expect.objectContaining({ properties: expect.objectContaining({ walk: true }) })])
      })
    }));
    await act(async () => container.querySelector<HTMLAnchorElement>('nav[aria-label="Nearby sidebar"] a').click());
    expect(map.removeSource).toHaveBeenCalledWith("planner-itineraries");
    expect(setNearbyStops).toHaveBeenCalled();
    expect(transferPopup.isConnected).toBe(false);
    expect(marker.remove).toHaveBeenCalledTimes(7);
    expect(layers.size).toBe(0);
    expect(map.remove).not.toHaveBeenCalled();
  });

  it("searches the map center, moves a dropped pin, and returns to a fresh device location", async () => {
    await render("/nearby/stops");
    await act(async () => finishMapLoading());
    await act(async () => button("Search this area").click());
    expect(getNearbyStops).toHaveBeenLastCalledWith({ coords: { longitude: 1, latitude: 2 } }, 1000);
    expect(container.textContent).toContain("Map center");

    await act(async () => button("Drop a pin").click());
    expect(marker.setLngLat).toHaveBeenCalledWith([1, 2]);
    const dragEnd = marker.on.mock.calls.find(([event]) => event === "dragend")[1];
    await act(async () => dragEnd());
    expect(getNearbyStops).toHaveBeenLastCalledWith({ coords: { longitude: 3, latitude: 4 } }, 1000);
    expect(marker.remove).toHaveBeenCalled();

    jest.mocked(getCurrentPosition).mockResolvedValueOnce({ coords: { latitude: 6, longitude: 5 } });
    await act(async () => button("Find near me").click());
    expect(getNearbyStops).toHaveBeenLastCalledWith({ coords: { longitude: 5, latitude: 6 } }, 1000);
    expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [5, 6] }));
    expect(container.textContent).toContain("Near me");
  });

  it("keeps the map usable when location is denied and retries location", async () => {
    jest.mocked(getCurrentPosition).mockRejectedValueOnce(new Error("denied"));
    await render("/nearby/stops");
    expect(container.textContent).toContain("Location unavailable");
    expect(getNearbyStops).not.toHaveBeenCalled();
    await act(async () => finishMapLoading());
    await act(async () => button("Search this area").click());
    expect(getNearbyStops).toHaveBeenLastCalledWith({ coords: { longitude: 1, latitude: 2 } }, 1000);
    expect(container.textContent).not.toContain("Location unavailable");
    await act(async () => button("Find near me").click());
    expect(getNearbyStops).toHaveBeenLastCalledWith(expect.objectContaining({ coords: expect.objectContaining({ longitude: 0, latitude: 0 }) }), 1000);
  });

  it("does not let a late device location replace a newer map search", async () => {
    let resolveLocation: (value: { coords: { latitude: number; longitude: number } }) => void;
    await render("/nearby/stops");
    await act(async () => finishMapLoading());
    jest.mocked(getCurrentPosition).mockImplementationOnce(() => new Promise(resolve => { resolveLocation = resolve; }));
    await act(async () => button("Find near me").click());
    await act(async () => button("Search this area").click());
    await act(async () => resolveLocation({ coords: { longitude: 8, latitude: 9 } }));
    expect(getNearbyStops).toHaveBeenLastCalledWith({ coords: { longitude: 1, latitude: 2 } }, 1000);
    expect(container.textContent).toContain("Map center");
  });

  it("retries a failed stop search without changing its location", async () => {
    await render("/nearby/stops");
    await act(async () => finishMapLoading());
    jest.mocked(getNearbyStops).mockRejectedValueOnce(new Error("network"));
    await act(async () => button("Search this area").click());
    expect(container.textContent).toContain("Nearby stops could not be loaded");
    await act(async () => button("Retry").click());
    expect(getNearbyStops).toHaveBeenLastCalledWith({ coords: { longitude: 1, latitude: 2 } }, 1000);
    expect(container.textContent).toContain("Sidebar ready");
  });

  it("ignores an older search response after changing the radius", async () => {
    let resolveOlder: (value: StopData) => void;
    function RadiusControl() {
      const { handleRadiusSelectionChange } = useOutletContext<NearbyViewComponentOutletContextProps>();
      return <select aria-label="Test radius" onChange={handleRadiusSelectionChange}><option value="1000">1000</option><option value="500">500</option></select>;
    }
    await act(async () => root.render(
      <FeatureFlagsProvider><MemoryRouter initialEntries={["/nearby/stops"]}><Routes>
        <Route path="/nearby" element={<NearbyViewComponent />}><Route path="*" element={<RadiusControl />} /></Route>
      </Routes></MemoryRouter></FeatureFlagsProvider>
    ));
    await act(async () => finishMapLoading());
    jest.mocked(getNearbyStops).mockImplementationOnce(() => new Promise(resolve => { resolveOlder = resolve; }));
    const select = container.querySelector<HTMLSelectElement>('[aria-label="Test radius"]');
    await act(async () => {
      select.value = "500";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => button("Search this area").click());
    expect(getNearbyStops).toHaveBeenLastCalledWith({ coords: { longitude: 1, latitude: 2 } }, 500);
    await act(async () => resolveOlder({ ...stops, location: [] }));
    expect(setNearbyStops).toHaveBeenLastCalledWith(map, { 101: stops.location[0] }, ["56"], expect.any(Function));
  });

  it("restores route details and their map overlay after searching another area", async () => {
    await act(async () => root.render(
      <FeatureFlagsProvider><MemoryRouter initialEntries={["/nearby/simple-routes?route=56"]}><Routes>
        <Route path="/nearby" element={<NearbyViewComponent />}>
          <Route path="simple-routes" element={<NearbySimpleRoutesComp />} />
        </Route>
      </Routes></MemoryRouter></FeatureFlagsProvider>
    ));
    await act(async () => finishMapLoading());
    const cleanup = jest.mocked(showRouteInfo).mock.results[0].value;
    await act(async () => button("Search this area").click());
    expect(cleanup).toHaveBeenCalled();
    expect(container.querySelector('[aria-label="Route 56 details"]')).not.toBeNull();
    expect(showRouteInfo).toHaveBeenCalledTimes(2);
  });

  it.each(["/nearby/stops", "/nearby/simple-routes"])(
    "loads markers on a fresh %s before mounting its sidebar",
    async (path) => {
      await render(path);
      expect(setNearbyStops).not.toHaveBeenCalled();
      expect(container.textContent).not.toContain("Sidebar ready");
      finishMapLoading();
      expect(setNearbyStops).toHaveBeenCalledTimes(1);
      expect(setNearbyStops).toHaveBeenCalledWith(
        map,
        { 101: stops.location[0] },
        ["56"],
        expect.any(Function)
      );
      expect(container.textContent).toContain("Sidebar ready");
    }
  );

  it("opens a homepage stop outside the radius without location or a loaded map", async () => {
    jest.mocked(getArrivals).mockResolvedValue({
      arrival: [], detour: [], queryTime: "",
      location: [{ desc: "Far stop", dir: "E", id: 8455, lat: 2, lng: 1, passengerCode: "E" }]
    });
    const showMarker = jest.requireMock("../view/nearby/util/mapbox/stopLocationMarker.util").showStopDetailMarker;
    await act(async () => root.render(
      <FeatureFlagsProvider>
        <MemoryRouter initialEntries={["/nearby/stops/8455?referrer=%2F"]}>
          <Routes>
            <Route path="/" element={<p>Home</p>} />
            <Route path="/nearby" element={<NearbyViewComponent />}>
              <Route path="stops/:id" element={<NearbyStopDetailComponent />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </FeatureFlagsProvider>
    ));
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(getArrivals).toHaveBeenCalledWith("8455", 90);
    expect(container.textContent).toContain("Far stop");
    expect(container.textContent).toContain("Departures");
    expect(container.querySelector<HTMLAnchorElement>('a[aria-label="Back"]').getAttribute("href")).toBe("/");
    expect(showMarker).not.toHaveBeenCalled();
    await act(async () => finishMapLoading());
    expect(showMarker).toHaveBeenCalledWith(map, expect.objectContaining({ id: 8455 }));
    expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [1, 2] }));
    expect(getArrivals).toHaveBeenCalledTimes(1);
    await act(async () => container.querySelector<HTMLAnchorElement>('a[aria-label="Back"]').click());
    expect(container.textContent).toContain("Home");
  });

  it("shows a direct stop when device location is denied", async () => {
    jest.mocked(getCurrentPosition).mockRejectedValueOnce(new Error("denied"));
    jest.mocked(getArrivals).mockResolvedValue({
      arrival: [], detour: [], queryTime: "",
      location: [{ desc: "Far stop", dir: "E", id: 8455, lat: 2, lng: 1, passengerCode: "E" }]
    });
    await act(async () => root.render(
      <FeatureFlagsProvider><MemoryRouter initialEntries={["/nearby/stops/8455"]}><Routes>
        <Route path="/nearby" element={<NearbyViewComponent />}>
          <Route path="stops/:id" element={<NearbyStopDetailComponent />} />
        </Route>
      </Routes></MemoryRouter></FeatureFlagsProvider>
    ));
    expect(container.textContent).toContain("Far stop");
    expect(container.textContent).toContain("Location unavailable");
    expect(container.textContent).toContain("Departures");
  });

  it("recreates markers after a full remount without opening Nearby Routes", async () => {
    await render("/nearby/stops");
    finishMapLoading();
    await act(async () => root.render(null));
    jest.mocked(setNearbyStops).mockClear();
    await render("/nearby/stops");
    expect(setNearbyStops).not.toHaveBeenCalled();
    finishMapLoading();
    expect(setNearbyStops).toHaveBeenCalledTimes(1);
  });

  it("shows a directly opened stop outside the nearby radius and removes its marker on exit", async () => {
    jest.mocked(getArrivals).mockResolvedValue({
      arrival: [], detour: [], queryTime: "",
      location: [{ desc: "Far stop", dir: "E", id: 8455, lat: 2, lng: 1, passengerCode: "E" }]
    });
    const showMarker = jest.requireMock("../view/nearby/util/mapbox/stopLocationMarker.util").showStopDetailMarker;
    await act(async () => root.render(
      <FeatureFlagsProvider>
        <MemoryRouter initialEntries={["/nearby/stops/8455"]}>
          <Routes>
            <Route path="/nearby" element={<NearbyViewComponent />}>
              <Route path="stops/:id" element={<NearbyStopDetailComponent />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </FeatureFlagsProvider>
    ));
    await act(async () => finishMapLoading());
    expect(setNearbyStops).toHaveBeenCalledWith(map, { 101: stops.location[0] }, ["56"], expect.any(Function));
    expect(showMarker).toHaveBeenCalledWith(map, expect.objectContaining({ id: 8455, lat: 2, lng: 1 }));
    const cleanup = showMarker.mock.results[0].value;
    await act(async () => root.render(null));
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("opens the nearby stop view when a route-info marker is clicked", async () => {
    await act(async () => root.render(
      <FeatureFlagsProvider>
        <MemoryRouter initialEntries={["/nearby/simple-routes?route=56&keep=yes#directions"]}>
          <Routes>
            <Route path="/nearby" element={<NearbyViewComponent />}>
              <Route path="simple-routes" element={<NearbySimpleRoutesComp />} />
              <Route path="stops/:id" element={<NearbyStopDetailComponent />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </FeatureFlagsProvider>
    ));
    await act(async () => finishMapLoading());
    jest.mocked(getArrivals).mockResolvedValue({
      arrival: [], detour: [], queryTime: "",
      location: [{ desc: "Example stop", dir: "E", id: 101, lat: 0, lng: 0.001, passengerCode: "E" }]
    });
    const stopClick = jest.mocked(showRouteInfo).mock.calls[0][3];
    await act(async () => stopClick(101));
    expect(jest.requireMock("../view/nearby/util/mapbox/stopLocationMarker.util").showStopDetailMarker)
      .toHaveBeenCalledWith(map, expect.objectContaining({ id: 101, lat: 0, lng: 0.001 }));
    const back = container.querySelector<HTMLAnchorElement>('a[aria-label="Back"]');
    expect(back.getAttribute("href")).toBe("/nearby/simple-routes?route=56&keep=yes#directions");
    await act(async () => back.click());
    expect(container.querySelector('[aria-label="Route 56 details"]')).not.toBeNull();
    expect(jest.mocked(showRouteInfo).mock.results[0].value).toHaveBeenCalled();
  });
});
