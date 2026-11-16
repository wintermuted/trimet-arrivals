import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import geoLocateCurrentPosition from "../api/geolocation/geoLocateCurrentPosition";
import { getNearbyStops } from "../api/trimet/stops";
import { StopData } from "../api/trimet/interfaces/types";
import { FeatureFlagsProvider } from "../component/feature-flags/FeatureFlags";
import NearbyViewComponent from "../view/nearby/components/NearbyViewComponent";
import { setNearbyStops } from "../view/nearby/util/mapbox/stopLocationMarker.util";

jest.mock("../api/geolocation/geoLocateCurrentPosition");
jest.mock("../api/trimet/stops");
jest.mock("../api/mapbox/walking");
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
  const map = { on: jest.fn(), remove: jest.fn(), resize: jest.fn() };
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
    jest
      .requireMock("../view/nearby/util/mapbox/initializeMap")
      .initializeMap.mockReturnValue(map);
    jest
      .requireMock("../view/nearby/util/mapbox/currentLocation")
      .initializeCurrentLocationMarker.mockReturnValue(map);
    jest
      .requireMock("../view/nearby/util/mapbox/stopLocationMarker.util")
      .setNearbyStops.mockReturnValue(map);
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
});
