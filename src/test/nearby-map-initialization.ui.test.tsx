import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import geoLocateCurrentPosition from "../api/geolocation/geoLocateCurrentPosition";
import { getNearbyStops } from "../api/trimet/stops";
import { getArrivals } from "../api/trimet/arrivals";
import { getRouteById } from "../api/trimet/routeConfig";
import { StopData } from "../api/trimet/interfaces/types";
import { FeatureFlagsProvider } from "../component/feature-flags/FeatureFlags";
import NearbyViewComponent, { NearbySimpleRoutesComp } from "../view/nearby/components/NearbyViewComponent";
import { setNearbyStops } from "../view/nearby/util/mapbox/stopLocationMarker.util";
import { showRouteInfo } from "../view/nearby/util/mapbox/routeInfo";

jest.mock("../api/geolocation/geoLocateCurrentPosition");
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
  updateStopMarkerColor: jest.fn(),
}));
jest.mock("mapbox-gl", () => ({
  __esModule: true,
  default: { accessToken: "pk.synthetic-test-token" },
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
  const map = { on: jest.fn(), remove: jest.fn(), resize: jest.fn(), flyTo: jest.fn() };
  const previousResizeObserver = global.ResizeObserver;

  beforeEach(() => {
    jest.clearAllMocks();
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      disconnect: jest.fn(),
      observe: jest.fn(),
    }));
    jest.mocked(geoLocateCurrentPosition).mockResolvedValue({
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

  it("opens the nearby stop view when a route-info marker is clicked", async () => {
    await act(async () => root.render(
      <FeatureFlagsProvider>
        <MemoryRouter initialEntries={["/nearby/simple-routes"]}>
          <Routes>
            <Route path="/nearby" element={<NearbyViewComponent />}>
              <Route path="simple-routes" element={<NearbySimpleRoutesComp />} />
              <Route path="stops/:id" element={<p>Stop detail opened</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </FeatureFlagsProvider>
    ));
    await act(async () => finishMapLoading());
    await act(async () => container.querySelector<HTMLButtonElement>(".transit-simple-route-details-link").click());
    const stopClick = jest.mocked(showRouteInfo).mock.calls[0][3];
    await act(async () => stopClick(101));
    expect(container.textContent).toContain("Stop detail opened");
    expect(jest.mocked(showRouteInfo).mock.results[0].value).toHaveBeenCalled();
  });
});
