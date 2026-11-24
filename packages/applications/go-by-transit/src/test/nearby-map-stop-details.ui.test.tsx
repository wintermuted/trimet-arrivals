import { vi } from "vitest";
import { act } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import getCurrentPosition from "../api/geolocation/getCurrentPosition";
import { getArrivals } from "../api/trimet/arrivals";
import { FeatureFlagsProvider } from "../component/feature-flags/FeatureFlags";
import NearbyViewComponent, { NearbySimpleRoutesComp } from "../view/nearby/components/NearbyViewComponent";
import { setNearbyStops } from "../view/nearby/util/mapbox/stopLocationMarker.util";
import { showRouteInfo } from "../view/nearby/util/mapbox/routeInfo";
import { setupNearbyMapTest, stops, StopDetailWithBookmarks } from "./nearby-map-test.fixture";

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

describe("Nearby direct stop routes, remounts and map clicks", () => {
  const fixture = setupNearbyMapTest();
  const { map, marker, render, finishMapLoading } = fixture;

  it("opens a homepage stop outside the radius before location or the map is ready", async () => {
    vi.mocked(getCurrentPosition).mockImplementationOnce(() => new Promise<never>(() => {}));
    vi.mocked(getArrivals).mockResolvedValue({
      arrival: [], detour: [], queryTime: "",
      location: [{ desc: "Far stop", dir: "E", id: 8455, lat: 2, lng: 1, passengerCode: "E" }]
    });
    const showMarker = (await vi.importMock("../view/nearby/util/mapbox/stopLocationMarker.util")).showStopDetailMarker;
    await act(async () => fixture.root.render(
      <FeatureFlagsProvider>
        <MemoryRouter initialEntries={["/nearby/stops/8455?referrer=%2F"]}>
          <Routes>
            <Route path="/" element={<p>Home</p>} />
            <Route path="/nearby" element={<NearbyViewComponent />}>
              <Route path="stops/:id" element={<StopDetailWithBookmarks />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </FeatureFlagsProvider>
    ));
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(getArrivals).toHaveBeenCalledWith("8455", 90);
    expect(fixture.container.textContent).toContain("Far stop");
    expect(fixture.container.textContent).toContain("Departures");
    expect(fixture.container.querySelector<HTMLAnchorElement>('a[aria-label="Back"]').getAttribute("href")).toBe("/");
    expect(showMarker).not.toHaveBeenCalled();
    await act(async () => finishMapLoading());
    expect(showMarker).toHaveBeenCalledWith(map, expect.objectContaining({ id: 8455 }));
    expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [1, 2] }));
    expect(getArrivals).toHaveBeenCalledTimes(1);
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>('a[aria-label="Back"]').click());
    expect(fixture.container.textContent).toContain("Home");
  });

  it("shows a direct stop when device location is denied", async () => {
    vi.mocked(getCurrentPosition).mockRejectedValueOnce(new Error("denied"));
    vi.mocked(getArrivals).mockResolvedValue({
      arrival: [], detour: [], queryTime: "",
      location: [{ desc: "Far stop", dir: "E", id: 8455, lat: 2, lng: 1, passengerCode: "E" }]
    });
    await act(async () => fixture.root.render(
      <FeatureFlagsProvider><MemoryRouter initialEntries={["/nearby/stops/8455"]}><Routes>
        <Route path="/nearby" element={<NearbyViewComponent />}>
          <Route path="stops/:id" element={<StopDetailWithBookmarks />} />
        </Route>
      </Routes></MemoryRouter></FeatureFlagsProvider>
    ));
    expect(fixture.container.textContent).toContain("Far stop");
    expect(fixture.container.textContent).toContain("Location unavailable");
    expect(fixture.container.textContent).toContain("Departures");
  });

  it("recreates markers after a full remount without opening Nearby Routes", async () => {
    await render("/nearby/stops");
    finishMapLoading();
    await act(async () => fixture.root.render(null));
    vi.mocked(setNearbyStops).mockClear();
    await render("/nearby/stops");
    expect(setNearbyStops).not.toHaveBeenCalled();
    finishMapLoading();
    expect(setNearbyStops).toHaveBeenCalledTimes(1);
  });

  it("shows a directly opened stop outside the nearby radius and removes its marker on exit", async () => {
    vi.mocked(getArrivals).mockResolvedValue({
      arrival: [], detour: [], queryTime: "",
      location: [{ desc: "Far stop", dir: "E", id: 8455, lat: 2, lng: 1, passengerCode: "E" }]
    });
    const showMarker = (await vi.importMock("../view/nearby/util/mapbox/stopLocationMarker.util")).showStopDetailMarker;
    await act(async () => fixture.root.render(
      <FeatureFlagsProvider>
        <MemoryRouter initialEntries={["/nearby/stops/8455"]}>
          <Routes>
            <Route path="/nearby" element={<NearbyViewComponent />}>
              <Route path="stops/:id" element={<StopDetailWithBookmarks />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </FeatureFlagsProvider>
    ));
    await act(async () => finishMapLoading());
    expect(setNearbyStops).toHaveBeenCalledWith(map, { 101: stops.location[0] }, ["56"], expect.any(Function));
    expect(showMarker).toHaveBeenCalledWith(map, expect.objectContaining({ id: 8455, lat: 2, lng: 1 }));
    const cleanup = showMarker.mock.results[0].value;
    await act(async () => fixture.root.render(null));
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("opens the nearby stop view when a route-info marker is clicked", async () => {
    await act(async () => fixture.root.render(
      <FeatureFlagsProvider>
        <MemoryRouter initialEntries={["/nearby/simple-routes?route=56&keep=yes#directions"]}>
          <Routes>
            <Route path="/nearby" element={<NearbyViewComponent />}>
              <Route path="simple-routes" element={<NearbySimpleRoutesComp />} />
              <Route path="stops/:id" element={<StopDetailWithBookmarks />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </FeatureFlagsProvider>
    ));
    await act(async () => finishMapLoading());
    vi.mocked(getArrivals).mockResolvedValue({
      arrival: [], detour: [], queryTime: "",
      location: [{ desc: "Example stop", dir: "E", id: 101, lat: 0, lng: 0.001, passengerCode: "E" }]
    });
    const stopClick = vi.mocked(showRouteInfo).mock.calls[0][3];
    await act(async () => stopClick(101));
    expect((await vi.importMock("../view/nearby/util/mapbox/stopLocationMarker.util")).showStopDetailMarker)
      .toHaveBeenCalledWith(map, expect.objectContaining({ id: 101, lat: 0, lng: 0.001 }));
    const back = fixture.container.querySelector<HTMLAnchorElement>('a[aria-label="Back"]');
    expect(back.getAttribute("href")).toBe("/nearby/simple-routes?route=56&keep=yes#directions");
    await act(async () => back.click());
    expect(fixture.container.querySelector('[aria-label="Route 56 details"]')).not.toBeNull();
    expect(vi.mocked(showRouteInfo).mock.results[0].value).toHaveBeenCalled();
  });
});
