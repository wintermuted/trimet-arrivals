import { vi } from "vitest";
import { act } from "react";
import { MemoryRouter, Route, Routes, useOutletContext } from "react-router-dom";
import getCurrentPosition from "../api/geolocation/getCurrentPosition";
import { getNearbyStops } from "../api/trimet/stops";
import { StopData } from "../api/trimet/interfaces/types";
import { FeatureFlagsProvider } from "../component/feature-flags/FeatureFlags";
import NearbyViewComponent, { NearbySimpleRoutesComp, NearbyViewComponentOutletContextProps } from "../view/nearby/components/NearbyViewComponent";
import { setNearbyStops } from "../view/nearby/util/mapbox/stopLocationMarker.util";
import { showRouteInfo } from "../view/nearby/util/mapbox/routeInfo";
import { NEARBY_ROUTE_LINES } from "../view/nearby/util/mapbox/routeLines";
import { setupNearbyMapTest, stops, mockVehicleFollow } from "./nearby-map-test.fixture";

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

describe("Nearby route search and location changes", () => {
  const fixture = setupNearbyMapTest();
  const { map, marker, sources, layers, routeGeometry, render, finishMapLoading, button } = fixture;

  it("draws nearby route directions once and clears them for empty results without moving the map", async () => {
    vi.mocked(getNearbyStops).mockResolvedValueOnce({
      ...stops,
      location: [...stops.location, { ...stops.location[0], locid: 102 }]
    });
    await render("/nearby/simple-routes");
    map.flyTo.mockClear();
    await act(async () => finishMapLoading());
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/56/56_0.json"), expect.objectContaining({ signal: expect.anything() })
    );
    expect(map.addSource).toHaveBeenCalledWith(NEARBY_ROUTE_LINES, {
      type: "geojson", data: { type: "FeatureCollection", features: [routeGeometry] }
    });
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: NEARBY_ROUTE_LINES, type: "line" }));

    vi.mocked(getNearbyStops).mockResolvedValueOnce({ ...stops, location: [] });
    await act(async () => button("Search this area").click());
    expect(layers.has(NEARBY_ROUTE_LINES)).toBe(false);
    expect(sources.has(NEARBY_ROUTE_LINES)).toBe(false);
    expect(map.fitBounds).not.toHaveBeenCalled();
    expect(map.flyTo).not.toHaveBeenCalled();
    expect(map.setZoom).not.toHaveBeenCalled();
  });

  it("ignores an old route response after searching a different area", async () => {
    const fetchGeometry = vi.mocked(global.fetch);
    let resolveOlder: (response: Pick<Response, "ok" | "json">) => void;
    fetchGeometry.mockImplementationOnce(() => new Promise(resolve => {
      resolveOlder = response => resolve(response as Response);
    }));
    await render("/nearby/simple-routes");
    await act(async () => finishMapLoading());
    const signal = fetchGeometry.mock.calls[0][1].signal;
    vi.mocked(getNearbyStops).mockResolvedValueOnce({ ...stops, location: [] });
    await act(async () => button("Search this area").click());
    expect(signal.aborted).toBe(true);
    await act(async () => resolveOlder({ ok: true, json: async () => routeGeometry }));
    expect(layers.has(NEARBY_ROUTE_LINES)).toBe(false);
  });

  it("searches the map center, moves a dropped pin, and returns to a fresh device location", async () => {
    await render("/nearby/stops");
    await act(async () => finishMapLoading());
    await act(async () => button("Search this area").click());
    expect(getNearbyStops).toHaveBeenLastCalledWith({ coords: { longitude: 1, latitude: 2 } }, 1000);
    expect(fixture.container.textContent).toContain("Map center");

    await act(async () => button("Drop a pin").click());
    expect(marker.setLngLat).toHaveBeenCalledWith([1, 2]);
    const dragEnd = marker.on.mock.calls.find(([event]) => event === "dragend")[1];
    await act(async () => dragEnd());
    expect(getNearbyStops).toHaveBeenLastCalledWith({ coords: { longitude: 3, latitude: 4 } }, 1000);
    expect(marker.remove).toHaveBeenCalled();

    vi.mocked(getCurrentPosition).mockResolvedValueOnce({ coords: { latitude: 6, longitude: 5 } });
    await act(async () => button("Find near me").click());
    expect(getNearbyStops).toHaveBeenLastCalledWith({ coords: { longitude: 5, latitude: 6 } }, 1000);
    expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [5, 6] }));
    expect(fixture.container.textContent).toContain("Near me");
  });

  it("keeps the map usable when location is denied and retries location", async () => {
    vi.mocked(getCurrentPosition).mockRejectedValueOnce(new Error("denied"));
    await render("/nearby/stops");
    expect(fixture.container.textContent).toContain("Location unavailable");
    expect(getNearbyStops).not.toHaveBeenCalled();
    await act(async () => finishMapLoading());
    await act(async () => button("Search this area").click());
    expect(getNearbyStops).toHaveBeenLastCalledWith({ coords: { longitude: 1, latitude: 2 } }, 1000);
    expect(fixture.container.textContent).not.toContain("Location unavailable");
    await act(async () => button("Find near me").click());
    expect(getNearbyStops).toHaveBeenLastCalledWith(expect.objectContaining({ coords: expect.objectContaining({ longitude: 0, latitude: 0 }) }), 1000);
  });

  it("does not let a late device location replace a newer map search", async () => {
    let resolveLocation: (value: { coords: { latitude: number; longitude: number } }) => void;
    await render("/nearby/stops");
    await act(async () => finishMapLoading());
    vi.mocked(getCurrentPosition).mockImplementationOnce(() => new Promise(resolve => { resolveLocation = resolve; }));
    await act(async () => button("Find near me").click());
    await act(async () => button("Search this area").click());
    await act(async () => resolveLocation({ coords: { longitude: 8, latitude: 9 } }));
    expect(getNearbyStops).toHaveBeenLastCalledWith({ coords: { longitude: 1, latitude: 2 } }, 1000);
    expect(fixture.container.textContent).toContain("Map center");
  });

  it("retries a failed stop search without changing its location", async () => {
    await render("/nearby/stops");
    await act(async () => finishMapLoading());
    vi.mocked(getNearbyStops).mockRejectedValueOnce(new Error("network"));
    await act(async () => button("Search this area").click());
    expect(fixture.container.textContent).toContain("Nearby stops could not be loaded");
    await act(async () => button("Retry").click());
    expect(getNearbyStops).toHaveBeenLastCalledWith({ coords: { longitude: 1, latitude: 2 } }, 1000);
    expect(fixture.container.textContent).toContain("Sidebar ready");
  });

  it("ignores an older search response after changing the radius", async () => {
    let resolveOlder: (value: StopData) => void;
    function RadiusControl() {
      const { handleRadiusSelectionChange } = useOutletContext<NearbyViewComponentOutletContextProps>();
      return <select aria-label="Test radius" onChange={handleRadiusSelectionChange}><option value="1000">1000</option><option value="500">500</option></select>;
    }
    await act(async () => fixture.root.render(
      <FeatureFlagsProvider><MemoryRouter initialEntries={["/nearby/stops"]}><Routes>
        <Route path="/nearby" element={<NearbyViewComponent />}><Route path="*" element={<RadiusControl />} /></Route>
      </Routes></MemoryRouter></FeatureFlagsProvider>
    ));
    await act(async () => finishMapLoading());
    vi.mocked(getNearbyStops).mockImplementationOnce(() => new Promise(resolve => { resolveOlder = resolve; }));
    const select = fixture.container.querySelector<HTMLSelectElement>('[aria-label="Test radius"]');
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
    await act(async () => fixture.root.render(
      <FeatureFlagsProvider><MemoryRouter initialEntries={["/nearby/simple-routes?route=56"]}><Routes>
        <Route path="/nearby" element={<NearbyViewComponent />}>
          <Route path="simple-routes" element={<NearbySimpleRoutesComp />} />
        </Route>
      </Routes></MemoryRouter></FeatureFlagsProvider>
    ));
    await act(async () => finishMapLoading());
    const cleanup = vi.mocked(showRouteInfo).mock.results[0].value;
    let resolveSearch: (value: StopData) => void;
    vi.mocked(getNearbyStops).mockImplementationOnce(() => new Promise(resolve => { resolveSearch = resolve; }));
    await act(async () => button("Search this area").click());
    expect(cleanup).toHaveBeenCalled();
    await act(async () => { resolveSearch(stops); });
    expect(fixture.container.querySelector('[aria-label="Route 56 details"]')).not.toBeNull();
    expect(fixture.container.querySelector(".transit-detail-header")).toBeNull();
    expect(button("Close")).not.toBeNull();
    expect(showRouteInfo).toHaveBeenCalledTimes(2);
    expect(layers.has(NEARBY_ROUTE_LINES)).toBe(false);
  });

  it("keeps route details mounted and drops pending automatic fits during and after following", async () => {
    mockVehicleFollow();
    await render("/nearby/simple-routes?route=56", true);
    await act(async () => finishMapLoading());
    const details = fixture.container.querySelector('[aria-label="Route 56 details"]');
    expect(details).not.toBeNull();
    const [, , , , canFit, isActive] = vi.mocked(showRouteInfo).mock.calls[0];
    expect(canFit()).toBe(true);
    await act(async () => button("Follow test trip").click());
    expect(details.closest("[hidden]")).not.toBeNull();
    expect(isActive()).toBe(false);
    expect(canFit()).toBe(false);
    const back = fixture.container.querySelector<HTMLAnchorElement>('[aria-label="Following vehicle trip"] a[aria-label="Back"]');
    await act(async () => back.click());
    expect(details.closest("[hidden]")).toBeNull();
    expect(isActive()).toBe(true);
    expect(canFit()).toBe(false);
    expect(showRouteInfo).toHaveBeenCalledTimes(1);
  });

  it.each(["/nearby/stops", "/nearby/simple-routes"])(
    "loads markers on a fresh %s before mounting its sidebar",
    async (path) => {
      await render(path);
      expect(setNearbyStops).not.toHaveBeenCalled();
      expect(fixture.container.textContent).not.toContain("Sidebar ready");
      finishMapLoading();
      expect(setNearbyStops).toHaveBeenCalledTimes(1);
      expect(setNearbyStops).toHaveBeenCalledWith(
        map,
        { 101: stops.location[0] },
        ["56"],
        expect.any(Function)
      );
      expect(fixture.container.textContent).toContain("Sidebar ready");
    }
  );
});
