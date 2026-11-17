import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useOutletContext } from "react-router-dom";
import getCurrentPosition from "../api/geolocation/getCurrentPosition";
import { getNearbyStops } from "../api/trimet/stops";
import { getArrivals } from "../api/trimet/arrivals";
import { getRouteById } from "../api/trimet/routeConfig";
import { StopData } from "../api/trimet/interfaces/types";
import { FeatureFlagsProvider } from "../component/feature-flags/FeatureFlags";
import NearbyViewComponent, { NearbySimpleRoutesComp, NearbyStopDetailComponent, NearbyViewComponentOutletContextProps } from "../view/nearby/components/NearbyViewComponent";
import { setNearbyStops } from "../view/nearby/util/mapbox/stopLocationMarker.util";
import { showRouteInfo } from "../view/nearby/util/mapbox/routeInfo";

jest.mock("../api/geolocation/getCurrentPosition");
jest.mock("../api/trimet/stops");
jest.mock("../api/trimet/arrivals");
jest.mock("../api/trimet/routeConfig");
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
jest.mock("mapbox-gl", () => ({
  __esModule: true,
  default: { accessToken: "pk.synthetic-test-token", Marker: jest.fn() },
}));

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

describe("Nearby map initialization independently of the sidebar", () => {
  let container: HTMLDivElement;
  let root: Root;
  const map = {
    on: jest.fn(), remove: jest.fn(), resize: jest.fn(), flyTo: jest.fn(),
    getCenter: jest.fn(() => ({ lng: 1, lat: 2 })), setZoom: jest.fn()
  };
  const marker = {
    setLngLat: jest.fn(), addTo: jest.fn(), getLngLat: jest.fn(() => ({ lng: 3, lat: 4 })),
    on: jest.fn(), off: jest.fn(), remove: jest.fn()
  };
  const previousResizeObserver = global.ResizeObserver;

  beforeEach(() => {
    jest.clearAllMocks();
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
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/nearby" element={<NearbyViewComponent />}>
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

  it.each(["/nearby/stops", "/nearby/stops/101", "/nearby/simple-routes"])(
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
