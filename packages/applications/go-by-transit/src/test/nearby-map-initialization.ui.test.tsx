import { vi } from "vitest";
import { act } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import getCurrentPosition from "../api/geolocation/getCurrentPosition";
import { getNearbyStops } from "../api/trimet/stops";
import { StopData } from "../api/trimet/interfaces/types";
import { FeatureFlagsProvider } from "../component/feature-flags/FeatureFlags";
import NearbyViewComponent from "../view/nearby/components/NearbyViewComponent";
import { setNearbyStops } from "../view/nearby/util/mapbox/stopLocationMarker.util";
import { NEARBY_ROUTE_LINES } from "../view/nearby/util/mapbox/routeLines";
import { setupNearbyMapTest, stops, NavigationProbe } from "./nearby-map-test.fixture";

vi.mock("../view/nearby/components/NearbyVehicles", () => ({ default: vi.fn(() => null) }));
vi.mock("../view/nearby/util/useVehiclePositions", () => ({
  useVehiclePositions: () => ({ vehicles: [], rejected: 0, status: "empty", retry: vi.fn() }),
}));
vi.mock("../api/geolocation/getCurrentPosition");
vi.mock("../api/trimet/stops");
vi.mock("../api/trimet/arrivals");
vi.mock("../api/trimet/routeConfig");
vi.mock("../api/trimet/stopCatalog", async () => ({
  ...(await vi.importActual<typeof import("../api/trimet/stopCatalog")>("../api/trimet/stopCatalog")),
  getStopCatalog: vi.fn(),
}));
vi.mock("../api/trimet/tripplanner");
vi.mock("../view/nearby/util/mapbox/routeLines", async () => ({
  ...(await vi.importActual<typeof import("../view/nearby/util/mapbox/routeLines")>("../view/nearby/util/mapbox/routeLines")),
  getRouteGeometry: vi.fn(),
}));
vi.mock("../api/mapbox/walking");
vi.mock("../view/nearby/util/mapbox/routeInfo", () => ({
  highlightRouteInfoStop: vi.fn(),
  showRouteInfo: vi.fn(),
}));
vi.mock("../view/nearby/util/mapbox/initializeMap", () => ({
  initializeMap: vi.fn(),
}));
vi.mock("../view/nearby/components/NearbyPlacesMap", () => ({
  __esModule: true,
  default: vi.fn()
}));
vi.mock("../view/nearby/util/mapbox/currentLocation", () => ({
  initializeCurrentLocationMarker: vi.fn(),
  setCurrentLocationMarker: vi.fn(),
}));
vi.mock("../view/nearby/util/mapbox/stopLocationMarker.util", () => ({
  highlightNearbyStop: vi.fn(),
  removeCurrentLocationMarkers: vi.fn(),
  removeStopLocationLayers: vi.fn(),
  setNearbyStops: vi.fn(),
  showStopDetailMarker: vi.fn(() => vi.fn()),
  updateStopMarkerColor: vi.fn(),
}));
vi.mock("mapbox-gl", () => {
  const Marker = vi.fn();
  return {
    __esModule: true,
    default: { accessToken: "pk.synthetic-test-token", Marker },
    Marker,
    Popup: class {
      content: HTMLElement;
      close: () => void;
      setLngLat() { return this; }
      setDOMContent(content: HTMLElement) { this.content = content; return this; }
      setText(text: string) { this.content = globalThis.document.createElement("div"); this.content.textContent = text; return this; }
      on(_event: string, close: () => void) { this.close = close; return this; }
      addTo() { this.content.ownerDocument.body.appendChild(this.content); return this; }
      isOpen() { return this.content.isConnected; }
      remove() { this.content?.remove(); this.close?.(); }
    },
    LngLatBounds: class {
      extend() { return this; }
    },
  };
});

describe("Nearby landing map and background location", () => {
  const fixture = setupNearbyMapTest();
  const { map, layers, render, finishMapLoading, button } = fixture;

  it("loads the Portland overview while locating in the background, then recovers Explore without requesting again", async () => {
    let resolveLocation: (value: { coords: { latitude: number; longitude: number } }) => void;
    let resolveStops: (value: StopData) => void;
    vi.mocked(getCurrentPosition).mockImplementationOnce(() => new Promise(resolve => { resolveLocation = resolve; }));
    vi.mocked(getNearbyStops).mockImplementationOnce(() => new Promise(resolve => { resolveStops = resolve; }));

    await render("/nearby", true);
    const sidebarSkeleton = () => fixture.container.querySelector(".transit-nearby-results-skeleton");
    const mapSkeleton = () => fixture.container.querySelector(".transit-nearby-map-skeleton");
    const mapCanvas = fixture.container.querySelector(".transit-nearby-map-canvas");
    const { initializeMap } = (await vi.importMock("../view/nearby/util/mapbox/initializeMap"));
    expect(initializeMap).toHaveBeenLastCalledWith(-122.6784, 45.5152, expect.anything(), 10);
    expect(mapSkeleton()?.textContent).toBe("Loading map…");
    expect(sidebarSkeleton()).toBeNull();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(getNearbyStops).not.toHaveBeenCalled();

    finishMapLoading();
    expect(mapSkeleton()).toBeNull();
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>('.transit-nearby-tile[href="/nearby/simple-routes"]').click());
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(fixture.container.querySelector(".transit-nearby-map-canvas")).toBe(mapCanvas);
    expect(sidebarSkeleton()?.textContent).toBe("Finding your location…");
    expect(mapSkeleton()).toBeNull();

    await act(async () => resolveLocation({ coords: { latitude: 0, longitude: 0 } }));
    expect(sidebarSkeleton()?.textContent).toBe("Loading nearby stops…");
    expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [0, 0], zoom: 16 }));

    await act(async () => resolveStops(stops));
    expect(sidebarSkeleton()).toBeNull();
    expect(fixture.container.querySelector(".transit-explore-routes")).not.toBeNull();
    expect(map.flyTo).toHaveBeenCalledTimes(1);
    expect(layers.has(NEARBY_ROUTE_LINES)).toBe(true);

    const { removeCurrentLocationMarkers, removeStopLocationLayers } =
      (await vi.importMock("../view/nearby/util/mapbox/stopLocationMarker.util"));
    const { setCurrentLocationMarker } =
      (await vi.importMock("../view/nearby/util/mapbox/currentLocation"));
    expect(setCurrentLocationMarker).toHaveBeenCalledWith(map, 0, 0, 1000);
    removeCurrentLocationMarkers.mockClear();
    removeStopLocationLayers.mockClear();
    setCurrentLocationMarker.mockClear();
    vi.mocked(setNearbyStops).mockClear();

    await act(async () => fixture.container.querySelector<HTMLAnchorElement>('.transit-detail-back').click());
    expect(map.flyTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [-122.6784, 45.5152], zoom: 10 }));
    expect(fixture.container.querySelector(".transit-nearby-map-canvas")).toBe(mapCanvas);
    expect(fixture.container.querySelector(".transit-map-location-status").textContent).toBe("Near me");
    expect(removeCurrentLocationMarkers).toHaveBeenCalledWith(map);
    expect(removeStopLocationLayers).toHaveBeenCalledWith(map);
    expect(setCurrentLocationMarker).not.toHaveBeenCalled();
    expect(setNearbyStops).not.toHaveBeenCalled();
    expect(layers.has(NEARBY_ROUTE_LINES)).toBe(false);
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>('.transit-nearby-tile[href="/nearby/simple-routes"]').click());
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(fixture.container.querySelector(".transit-explore-routes")).not.toBeNull();
    expect(map.flyTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [0, 0], zoom: 16 }));
  });

  it("does not recenter the landing map or load transit when a pending location arrives after going back", async () => {
    let resolveLocation: (value: { coords: { latitude: number; longitude: number } }) => void;
    vi.mocked(getCurrentPosition).mockImplementationOnce(() => new Promise(resolve => { resolveLocation = resolve; }));
    await render("/nearby/simple-routes");
    finishMapLoading();

    await act(async () => fixture.container.querySelector<HTMLAnchorElement>('.transit-detail-back').click());
    await act(async () => resolveLocation({ coords: { latitude: 0, longitude: 0 } }));

    expect(getNearbyStops).not.toHaveBeenCalled();
    expect(map.flyTo).toHaveBeenCalledTimes(1);
    expect(map.flyTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [-122.6784, 45.5152], zoom: 10 }));
  });

  it("requests a fresh location when Nearby is reopened after leaving, without delaying its launcher", async () => {
    await act(async () => fixture.root.render(<FeatureFlagsProvider>
      <MemoryRouter initialEntries={["/", "/nearby"]}>
        <NavigationProbe />
        <Routes>
          <Route path="/" element={<p>Outside Nearby</p>} />
          <Route path="/nearby" element={<NearbyViewComponent />} />
        </Routes>
      </MemoryRouter>
    </FeatureFlagsProvider>));
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    await act(async () => button("Browser back").click());
    expect(fixture.container.textContent).toContain("Outside Nearby");
    await act(async () => button("Browser forward").click());
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(fixture.container.querySelector(".transit-nearby-launcher")).not.toBeNull();
    expect(getNearbyStops).not.toHaveBeenCalled();
  });
});
