import { vi } from "vitest";
import { act } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import getCurrentPosition from "../api/geolocation/getCurrentPosition";
import { getNearbyStops } from "../api/trimet/stops";
import { FeatureFlagsProvider } from "../component/feature-flags/FeatureFlags";
import NearbyViewComponent from "../view/nearby/components/NearbyViewComponent";
import { getStopCatalog } from "../api/trimet/stopCatalog";
import { planTrip } from "../api/trimet/tripplanner";
import * as placesApi from "@overworld/places/catalog";
import NearbyPlacesMap from "../view/nearby/components/NearbyPlacesMap";
import * as placeIcons from "../view/nearby/util/mapbox/placeIcons";
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

describe("Nearby Places map lifecycle and location recovery", () => {
  const fixture = setupNearbyMapTest();
  const { map, marker, sources, layers, images, render, finishMapLoading, button, discoveryCatalog, discoveryPark } = fixture;

  it("removes Places layers, sources, icons and popup listeners before destroying the map on navigation away", async () => {
    vi.mocked(NearbyPlacesMap).mockImplementation(
      (await vi.importActual<typeof import("../view/nearby/components/NearbyPlacesMap")>("../view/nearby/components/NearbyPlacesMap")).default
    );
    vi.spyOn(placeIcons, "createPlaceIconImage").mockReturnValue({
      width: 48, height: 48, data: new Uint8Array(48 * 48 * 4)
    });
    discoveryCatalog([discoveryPark]);
    let removed = false;
    map.remove.mockImplementationOnce(() => { removed = true; });
    map.getLayer.mockImplementation(id => {
      if (removed) throw new Error("Cannot query a destroyed map style");
      return layers.has(id);
    });
    map.getSource.mockImplementation(id => {
      if (removed) throw new Error("Cannot query a destroyed map style");
      return sources.has(id) ? { setData: vi.fn() } : undefined;
    });
    await act(async () => fixture.root.render(<FeatureFlagsProvider>
      <MemoryRouter initialEntries={["/", "/nearby/places"]}>
        <NavigationProbe />
        <Routes>
          <Route path="/" element={<p>Outside Nearby</p>} />
          <Route path="/nearby/*" element={<NearbyViewComponent />} />
        </Routes>
      </MemoryRouter>
    </FeatureFlagsProvider>));
    finishMapLoading();
    expect(fixture.container.querySelector(".transit-place-result")?.textContent).toContain(discoveryPark.name);
    expect(layers.has("nearby-places-park-icons")).toBe(true);

    await act(async () => button("Browser back").click());

    expect(fixture.container.textContent).toContain("Outside Nearby");
    expect(removed).toBe(true);
    expect(sources.size).toBe(0);
    expect(layers.size).toBe(0);
    expect(images.size).toBe(0);
    expect(map.off).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(Math.max(...map.removeLayer.mock.invocationCallOrder)).toBeLessThan(map.remove.mock.invocationCallOrder[0]);
    expect(Math.max(...map.removeSource.mock.invocationCallOrder)).toBeLessThan(map.remove.mock.invocationCallOrder[0]);
    expect(Math.max(...map.removeImage.mock.invocationCallOrder)).toBeLessThan(map.remove.mock.invocationCallOrder[0]);
  });

  it.each(["icon creation", "layer installation"])("keeps selectable results when initial %s fails, and recovers through marker retry", async failure => {
    vi.mocked(NearbyPlacesMap).mockImplementation(
      (await vi.importActual<typeof import("../view/nearby/components/NearbyPlacesMap")>("../view/nearby/components/NearbyPlacesMap")).default
    );
    const createIcon = vi.spyOn(placeIcons, "createPlaceIconImage").mockReturnValue({
      width: 48, height: 48, data: new Uint8Array(48 * 48 * 4)
    });
    if (failure === "icon creation") createIcon.mockImplementation(() => { throw new Error("Canvas unavailable"); });
    else map.addLayer.mockImplementationOnce(() => { throw new Error("Layer installation failed"); });
    discoveryCatalog([discoveryPark]);
    await render("/nearby/places");
    finishMapLoading();

    expect(fixture.container.querySelector(".transit-place-result")?.textContent).toContain(discoveryPark.name);
    expect(fixture.container.textContent).toContain("Place markers could not be drawn");
    expect(fixture.container.textContent).not.toContain("Preparing the map area");
    expect(images.size).toBeLessThan(placesApi.PLACE_CATEGORIES.length);
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>(".transit-place-result").click());
    expect(fixture.container.querySelector("#selected-place-heading")?.textContent).toBe(discoveryPark.name);
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>(".transit-detail-back").click());
    createIcon.mockReturnValue({ width: 48, height: 48, data: new Uint8Array(48 * 48 * 4) });
    await act(async () => button("Retry place categories").click());
    expect(fixture.container.textContent).not.toContain("Place markers could not be drawn");
    expect(layers.has("nearby-places-park-icons")).toBe(true);
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>(".transit-place-result").click());
    expect(fixture.container.querySelector("#selected-place-heading")?.textContent).toBe(discoveryPark.name);
  });

  it("keeps Places and details usable while permission is pending and adds the routing origin when it arrives", async () => {
    let resolveLocation: (value: { coords: { latitude: number; longitude: number } }) => void;
    vi.mocked(getCurrentPosition).mockImplementationOnce(() => new Promise(resolve => { resolveLocation = resolve; }));
    discoveryCatalog([discoveryPark]);
    await render("/nearby/places");
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(fixture.container.querySelector(".transit-places-filters")).not.toBeNull();
    finishMapLoading();
    expect(fixture.container.querySelector(".transit-places-list").textContent).toContain(discoveryPark.name);
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>(".transit-place-result").click());
    const plannerLink = () => fixture.container.querySelector<HTMLAnchorElement>('a[href*="toPlaceId"]');
    expect(new URLSearchParams(plannerLink().search).has("fromCoord")).toBe(false);
    await act(async () => resolveLocation({ coords: { latitude: 45.51, longitude: -122.68 } }));
    expect(new URLSearchParams(plannerLink().search).get("fromCoord")).toBe("-122.68,45.51");
    expect(new URLSearchParams(plannerLink().search).get("fromOrigin")).toBe("device");
    expect(button("Finding your location")).toBeUndefined();
    expect(map.flyTo).not.toHaveBeenCalled();
    expect(map.jumpTo).toHaveBeenLastCalledWith({ center: discoveryPark.coordinates, zoom: 15 });
    expect(getNearbyStops).not.toHaveBeenCalled();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("keeps Places after denial and recovers its dependent routing origin through the inline retry", async () => {
    vi.mocked(getCurrentPosition).mockRejectedValueOnce(new Error("denied"));
    discoveryCatalog([discoveryPark]);
    await render(placesApi.placeDetailLink(discoveryPark.id));
    finishMapLoading();
    expect(fixture.container.querySelector("#selected-place-heading").textContent).toBe(discoveryPark.name);
    expect(fixture.container.querySelector('[aria-label="Current location error"]')).not.toBeNull();
    const plannerLink = () => fixture.container.querySelector<HTMLAnchorElement>('a[href*="toPlaceId"]');
    expect(new URLSearchParams(plannerLink().search).has("fromCoord")).toBe(false);
    await act(async () => button("Retry current location").click());
    expect(fixture.container.querySelector('[aria-label="Current location error"]')).toBeNull();
    expect(new URLSearchParams(plannerLink().search).get("fromCoord")).toBe("0,0");
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(getNearbyStops).not.toHaveBeenCalled();
  });

  it("shows a Places error and matching tooltip after an explicit location request fails, then recovers on retry", async () => {
    discoveryCatalog([discoveryPark]);
    await render("/nearby/places");
    finishMapLoading();
    vi.mocked(getCurrentPosition).mockRejectedValueOnce(new Error("timeout"));
    await act(async () => button("Find near me").click());

    const message = "Current location is unavailable. Check browser permissions and retry, or keep browsing the map.";
    const status = fixture.container.querySelector(".transit-map-location-status")?.parentElement;
    expect(status?.querySelector('[role="alert"]')?.textContent).toBe(message);
    expect(fixture.container.querySelector(".transit-place-result")?.textContent).toContain(discoveryPark.name);
    act(() => button("Current location error").focus());
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(message);
    await act(async () => button("Retry current location").click());
    expect(fixture.container.querySelector('[aria-label="Current location error"]')).toBeNull();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(getCurrentPosition).toHaveBeenCalledTimes(3);
    expect(getNearbyStops).not.toHaveBeenCalled();
  });

  it("does not wait for background location before planning an explicit trip or move its map when the fix arrives", async () => {
    let resolveLocation: (value: { coords: { latitude: number; longitude: number } }) => void;
    vi.mocked(getCurrentPosition).mockImplementationOnce(() => new Promise(resolve => { resolveLocation = resolve; }));
    vi.mocked(getStopCatalog).mockResolvedValue({
      stops: [101, 202].map(locid => ({ ...stops.location[0], locid, aliases: [], seq: 1, tp: false })),
      routeCount: 1, directionCount: 1, stopReferenceCount: 2,
      incompleteRouteCount: 0, incompleteDirectionCount: 0, incompleteRouteNames: [], invalidStopCount: 0
    });
    vi.mocked(planTrip).mockResolvedValue({ success: true, partial: false, itineraries: [] });
    await render("/nearby/planner?from=101&to=202");
    expect(planTrip).toHaveBeenCalledWith(expect.objectContaining({ fromPlace: "101", toPlace: "202" }));
    expect(fixture.container.querySelector(".transit-planner")).not.toBeNull();
    await act(async () => resolveLocation({ coords: { latitude: 45.51, longitude: -122.68 } }));
    expect(planTrip).toHaveBeenCalledTimes(1);
    expect(map.flyTo).not.toHaveBeenCalled();
    expect(getNearbyStops).not.toHaveBeenCalled();
  });
});
