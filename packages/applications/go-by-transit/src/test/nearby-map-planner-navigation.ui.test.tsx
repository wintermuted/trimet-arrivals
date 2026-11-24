import { vi } from "vitest";
import { act } from "react";
import getCurrentPosition from "../api/geolocation/getCurrentPosition";
import { getNearbyStops } from "../api/trimet/stops";
import { getArrivals } from "../api/trimet/arrivals";
import { getStopCatalog } from "../api/trimet/stopCatalog";
import { planTrip } from "../api/trimet/tripplanner";
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

describe("Nearby stop and planner navigation without geolocation", () => {
  const fixture = setupNearbyMapTest();
  const { map, render, finishMapLoading, button } = fixture;

  it("opens the sidebar planner with the exact stop detail destination and no boarding stop", async () => {
    vi.mocked(getCurrentPosition).mockRejectedValueOnce(new Error("denied"));
    const stop = { desc: "Shared platform name", dir: "E", id: 8455, lat: 45.52, lng: -122.67, passengerCode: "E" };
    vi.mocked(getArrivals).mockResolvedValue({
      arrival: [], detour: [], queryTime: "", location: [stop]
    });
    vi.mocked(getStopCatalog).mockResolvedValue({
      stops: [8454, 8455].map(locid => ({
        ...stop, locid, aliases: [], seq: 1, tp: false,
      })),
      routeCount: 1, directionCount: 1, stopReferenceCount: 2,
      incompleteRouteCount: 0, incompleteDirectionCount: 0,
      incompleteRouteNames: [], invalidStopCount: 0,
    });

    await render("/nearby/stops/8455");
    expect(fixture.container.querySelector('[role="group"][aria-label="Filter departures by route"]')).not.toBeNull();
    expect(fixture.container.textContent).not.toContain("Routes serving this stop (filter departures)");
    const action = Array.from(fixture.container.querySelectorAll("a"))
      .find(link => link.textContent.trim() === "Plan a trip to this stop");
    expect(action.getAttribute("href")).toBe("/nearby/planner?to=8455");
    await act(async () => action.click());

    const [boarding, destination] = Array.from(fixture.container.querySelectorAll(".transit-planner-stop-select"));
    expect(boarding.textContent).toContain("Search stops or common places");
    expect(destination.textContent).toContain("Shared platform name (8455)");
    expect(button("Find trips").disabled).toBe(true);
    expect(planTrip).not.toHaveBeenCalled();
  });

  it("plans a deep-linked trip without geolocation and switches views without replacing the map", async () => {
    vi.mocked(getCurrentPosition).mockRejectedValueOnce(new Error("denied"));
    vi.mocked(getStopCatalog).mockResolvedValue({
      stops: [101, 202].map(locid => ({
        ...stops.location[0], locid, aliases: [], seq: 1, tp: false,
      })),
      routeCount: 1, directionCount: 1, stopReferenceCount: 2,
      incompleteRouteCount: 0, incompleteDirectionCount: 0,
      incompleteRouteNames: [], invalidStopCount: 0,
    });
    vi.mocked(planTrip).mockResolvedValue({
      success: true, partial: false, itineraries: [],
    });
    await render("/nearby/planner?from=101&to=202");
    const mapCanvas = fixture.container.querySelector(".transit-nearby-map-canvas");
    const back = fixture.container.querySelector<HTMLAnchorElement>('.transit-detail-header a[aria-label="Back"]');
    expect(back.getAttribute("href")).toBe("/nearby");
    expect(fixture.container.querySelector(".transit-nearby-launcher")).toBeNull();
    expect(getNearbyStops).not.toHaveBeenCalled();
    expect(planTrip).toHaveBeenCalledWith(
      expect.objectContaining({ fromPlace: "101", toPlace: "202" })
    );
    expect(fixture.container.textContent).toContain("No trips were found");
    expect(fixture.container.textContent).not.toContain("Choose any two TriMet stops");
    expect(fixture.container.textContent).not.toContain("Location unavailable");
    expect(mapCanvas).not.toBeNull();

    await act(async () => back.click());
    const explore = fixture.container.querySelector<HTMLAnchorElement>('.transit-nearby-tile[href="/nearby/simple-routes"]');
    expect(explore).not.toBeNull();
    await act(async () => explore.click());
    expect(fixture.container.querySelector(".transit-detail-header").textContent).toContain("Explore");
    expect(fixture.container.querySelector(".transit-nearby-launcher")).toBeNull();
    expect(fixture.container.textContent).toContain("Location unavailable");
    expect(fixture.container.querySelector(".transit-planner")).toBeNull();
    expect(fixture.container.querySelector(".transit-nearby-map-canvas")).toBe(mapCanvas);
    expect(map.remove).not.toHaveBeenCalled();

    await act(async () => fixture.container.querySelector<HTMLAnchorElement>('.transit-detail-header a[aria-label="Back"]').click());
    const planner = fixture.container.querySelector<HTMLAnchorElement>('.transit-nearby-tile[href="/nearby/planner"]');
    expect(planner).not.toBeNull();
    await act(async () => planner.click());
    expect(fixture.container.querySelector(".transit-detail-header").textContent).toContain("Plan a trip");
    expect(fixture.container.querySelector(".transit-planner")).not.toBeNull();
    expect(fixture.container.querySelector(".transit-nearby-map-canvas")).toBe(mapCanvas);
  });

  it.each(["/nearby/planner?keep=yes#options", "/nearby/simple-routes?keep=yes#routes"])(
    "returns to the captured referrer %s when trip following ends", async referrer => {
    vi.mocked(getStopCatalog).mockResolvedValue({
      stops: [], routeCount: 0, directionCount: 0, stopReferenceCount: 0,
      incompleteRouteCount: 0, incompleteDirectionCount: 0,
      incompleteRouteNames: [], invalidStopCount: 0,
    });
    mockVehicleFollow();
    await render(referrer);
    finishMapLoading();
    const planner = fixture.container.querySelector(".transit-planner");
    const mapCanvas = fixture.container.querySelector(".transit-nearby-map-canvas");
    await act(async () => button("Follow test trip").click());
    expect(fixture.container.querySelector('[aria-label="Following vehicle trip"]')).not.toBeNull();
    if (planner) {
      expect(planner.closest("[hidden]")).not.toBeNull();
      expect(fixture.container.querySelector(".transit-nearby-planner-footer").hasAttribute("hidden")).toBe(true);
    }
    const followHeader = fixture.container.querySelector('[aria-label="Following vehicle trip"] .transit-detail-header');
    expect(followHeader.textContent).toContain("Following Route 15");
    const back = followHeader.querySelector<HTMLAnchorElement>('a[aria-label="Back"]');
    expect(back.getAttribute("href")).toBe(referrer);
    await act(async () => back.click());
    expect(fixture.container.querySelector('[aria-label="Following vehicle trip"]')).toBeNull();
    expect(fixture.container.querySelector(".transit-planner")).toBe(planner);
    if (planner) expect(planner.closest("[hidden]")).toBeNull();
    await act(async () => button("Follow test trip").click());
    await act(async () => button("Vehicles").click());
    expect(fixture.container.querySelector('[aria-label="Following vehicle trip"]')).toBeNull();
    if (planner) expect(planner.closest("[hidden]")).toBeNull();
    expect(fixture.container.querySelector(".transit-nearby-map-canvas")).toBe(mapCanvas);
    expect(map.remove).not.toHaveBeenCalled();
  });
});
