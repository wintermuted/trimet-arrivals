import { vi } from "vitest";
import { act } from "react";
import { fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useOutletContext } from "react-router-dom";
import getCurrentPosition from "../api/geolocation/getCurrentPosition";
import { getNearbyStops } from "../api/trimet/stops";
import { FeatureFlagsProvider } from "../component/feature-flags/FeatureFlags";
import NearbyViewComponent, { NearbyViewComponentOutletContextProps } from "../view/nearby/components/NearbyViewComponent";
import { getStopCatalog } from "../api/trimet/stopCatalog";
import * as placesApi from "@overworld/places/catalog";
import { placesPreset, placesViewSearch, readPlacesView } from "@overworld/places/discovery";
import { SAVED_PLACES_KEY } from "@overworld/places/savedPlaces";
import { setupNearbyMapTest } from "./nearby-map-test.fixture";

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

describe("Nearby Places search, filters and navigation", () => {
  const fixture = setupNearbyMapTest();
  const { map, sources, layers, render, finishMapLoading, button, discoveryCatalog, discoveryPark } = fixture;

  it("opens a globally searched off-map cafe without enabling its category or replacing local filters", async () => {
    const cafe: placesApi.InterestPlace = { ...discoveryPark, id: "osm:cafe:node:12", category: "cafe",
      name: "Outside Cafe", coordinates: [-122.85, 45.55] };
    discoveryCatalog([discoveryPark, cafe]);
    const view = placesPreset("parks");
    view.filters.search = "Example";
    await render(`/nearby/places${placesViewSearch(view)}`, false, true);
    finishMapLoading();
    expect(fixture.container.querySelector<HTMLInputElement>('.transit-places-category--cafe input').checked).toBe(false);
    expect(fixture.container.querySelector(".transit-places-list").textContent).not.toContain(cafe.name);
    const input = fixture.container.querySelector<HTMLInputElement>('.transit-global-place-search input[type="search"]');
    await act(async () => input.focus());
    await act(async () => { fireEvent.change(input, { target: { value: cafe.name } }); });
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>("a[data-global-place]").click());
    expect(fixture.container.querySelector(".transit-place-detail").textContent).toContain(cafe.name);
    expect(map.jumpTo).toHaveBeenLastCalledWith({ center: cafe.coordinates, zoom: 15 });
    expect(fixture.container.querySelector<HTMLAnchorElement>('a[href*="toPlaceId"]').search).toContain("toPlaceId=osm%3Acafe%3Anode%3A12");
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>(".transit-detail-back").click());
    expect(fixture.container.querySelector<HTMLInputElement>('.transit-places-category--cafe input').checked).toBe(false);
    expect(fixture.container.querySelector<HTMLInputElement>('.transit-places input[type="search"]').value).toBe("Example");
    expect(fixture.container.querySelector(".transit-places-list").textContent).not.toContain(cafe.name);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("restores shared filters, reference layers and map position and retains the view through detail/planner header Back", async () => {
    discoveryCatalog([discoveryPark]);
    vi.mocked(getStopCatalog).mockRejectedValue(new Error("catalog unavailable"));
    const view = placesPreset("parks");
    view.filters.search = "Example";
    view.context.crossings = true;
    const search = placesViewSearch(view, { center: [-122.67, 45.55], zoom: 14 });
    await render(`/nearby/places${search}`);
    finishMapLoading();
    expect(fixture.container.querySelector(".transit-places-header")).toBeNull();
    expect(fixture.container.querySelector("#nearby-places-heading").classList.contains("wm-sr-only")).toBe(true);
    const help = fixture.container.querySelector<HTMLButtonElement>('.transit-detail-header button[aria-label="About Places"]');
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    await act(async () => help.focus());
    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip.textContent).toBe("Explore Portland places and practical stops. Filter by category or move the map to explore another area.");
    expect(help.getAttribute("aria-describedby")).toBe(tooltip.id);
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    await act(async () => help.blur());
    expect(fixture.container.querySelector<HTMLInputElement>('input[type="search"]').value).toBe("Example");
    expect(fixture.container.querySelector<HTMLInputElement>('.transit-places-category--food-cart-pod input').checked).toBe(false);
    expect(fixture.container.querySelector<HTMLInputElement>('.transit-places-category--picnic-seating input').checked).toBe(true);
    expect(map.jumpTo).toHaveBeenCalledWith({ center: [-122.67, 45.55], zoom: 14 });
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>(".transit-place-result").click());
    const plannerLink = fixture.container.querySelector<HTMLAnchorElement>('a[href*="toPlaceId"]');
    expect(readPlacesView(new URLSearchParams(plannerLink.search).get("placesView")).view).toEqual(view);
    await act(async () => plannerLink.click());
    expect(fixture.container.querySelector<HTMLAnchorElement>(".transit-detail-back").search).toContain("view=1");
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>(".transit-detail-back").click());
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>(".transit-detail-back").click());
    expect(fixture.container.querySelector<HTMLInputElement>('input[type="search"]').value).toBe("Example");
    expect(fixture.container.querySelector<HTMLInputElement>('.transit-places-category--picnic-seating input').checked).toBe(true);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("finds a saved place outside the viewport and removes it without navigating", async () => {
    const outside = { ...discoveryPark, id: "portland:park:2", name: "Outside Park", coordinates: [-122.85, 45.55] as [number, number] };
    discoveryCatalog([discoveryPark, outside]);
    localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify([{ id: outside.id, name: outside.name }]));
    await render("/nearby/places");
    finishMapLoading();
    expect(fixture.container.querySelector(".transit-places-list").textContent).not.toContain("Outside Park");
    await act(async () => fixture.container.querySelector<HTMLInputElement>('.transit-places-discovery input[type="checkbox"]').click());
    expect(fixture.container.querySelector(".transit-places-list").textContent).toContain("Outside Park");
    expect(fixture.container.querySelector(".transit-places-list").textContent).not.toContain("Example Park");
    expect(fixture.container.querySelector(".transit-map-location-status").textContent).toBe("Places in saved view");
    await act(async () => fixture.container.querySelector<HTMLButtonElement>(".transit-place-save").click());
    expect(JSON.parse(localStorage.getItem(SAVED_PLACES_KEY))).toEqual([]);
    expect(fixture.container.querySelector(".transit-places-list").textContent).not.toContain("Outside Park");
    expect(fixture.container.querySelector('[data-testid="current-url"]').textContent).toBe("/nearby/places");
  });

  it("filters places along mapped trip segments, changes distance and retains the originating planner link", async () => {
    discoveryCatalog([discoveryPark, { ...discoveryPark, id: "portland:park:2", name: "Farther Park", coordinates: [-122.67, 45.556] }]);
    function DiscoverTrip() {
      const { discoverPlacesAlongTrip } = useOutletContext<NearbyViewComponentOutletContextProps>();
      return <button onClick={() => discoverPlacesAlongTrip?.({
        lines: [[[-122.7, 45.55], [-122.65, 45.55]]], incomplete: true, returnTo: "/nearby/planner?from=101&to=202"
      })}>Discover trip places</button>;
    }
    await act(async () => fixture.root.render(<FeatureFlagsProvider><MemoryRouter initialEntries={["/nearby/planner?from=101&to=202"]}>
      <Routes><Route path="/nearby" element={<NearbyViewComponent />}>
        <Route path="planner" element={<DiscoverTrip />} /><Route path="places" element={null} />
      </Route></Routes>
    </MemoryRouter></FeatureFlagsProvider>));
    finishMapLoading();
    await act(async () => button("Discover trip places").click());
    expect(fixture.container.querySelector(".transit-places-list").textContent).toContain("Example Park");
    expect(fixture.container.querySelector(".transit-places-list").textContent).not.toContain("Farther Park");
    expect(fixture.container.textContent).toContain("Some trip legs have no mapped geometry");
    expect(fixture.container.querySelector(".transit-map-location-status").textContent).toBe("Places in trip corridor");
    const distance = fixture.container.querySelector<HTMLSelectElement>(".transit-places-trip-filter select");
    await act(async () => { distance.value = "1000"; distance.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(fixture.container.querySelector(".transit-places-list").textContent).toContain("Farther Park");
    expect(fixture.container.querySelector<HTMLAnchorElement>('.transit-places-trip-filter a').getAttribute("href")).toBe("/nearby/planner?from=101&to=202");
    expect(layers.has("nearby-trip-corridor")).toBe(true);
  });

  it("uses header Back for Places, preserves filters, and restores URL selection through browser and planner navigation", async () => {
    const place: placesApi.InterestPlace = {
      id: "portland:park:1", name: "Example Park", category: "park", coordinates: [-122.67, 45.52],
      arrival: "approximate", sourceUrl: "https://www.portlandmaps.com/"
    };
    const snapshot: placesApi.PlaceSnapshot = {
      version: 1, category: "park", retrievedAt: "2026-11-18T12:00:00Z",
      source: "City of Portland", sourceUrl: "https://www.portlandmaps.com/", license: "PDDL-1.0",
      licenseUrl: "https://opendatacommons.org/licenses/pddl/1-0/", coverage: "Test", places: [place]
    };
    vi.spyOn(placesApi, "usePlaceCatalog").mockReturnValue({
      places: [place], sources: { ...placesApi.emptyPlaceSources(), park: { snapshot, loading: false, error: false },
        "food-cart-pod": { loading: false, error: true } }, retry: vi.fn()
    });
    vi.mocked(getCurrentPosition).mockRejectedValue(new Error("denied"));
    vi.mocked(getNearbyStops).mockRejectedValue(new Error("unavailable"));
    vi.mocked(getStopCatalog).mockRejectedValue(new Error("catalog unavailable"));
    await render("/nearby/places");
    finishMapLoading();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(getNearbyStops).not.toHaveBeenCalled();
    expect(fixture.container.textContent).toContain("Example Park");
    expect(fixture.container.textContent).toContain("Food-cart pods could not be loaded");
    const neighborhoodToggle = () => fixture.container.querySelector<HTMLInputElement>(".transit-places-map-layers input");
    expect(neighborhoodToggle().checked).toBe(false);
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining("neighborhoods.json"), expect.anything());
    await act(async () => neighborhoodToggle().click());
    expect(fixture.container.textContent).toContain("Neighborhood boundaries could not be loaded");
    expect(fixture.container.querySelector(".transit-place-result")).not.toBeNull();
    const polygonToggle = () => fixture.container.querySelector<HTMLInputElement>(".transit-places-polygon-toggle input");
    expect(polygonToggle().checked).toBe(false);
    act(() => polygonToggle().click());
    act(() => fixture.container.querySelector<HTMLInputElement>('.transit-places-category--food-cart-pod input').click());
    act(() => fixture.container.querySelector<HTMLAnchorElement>(".transit-place-result").click());
    expect(fixture.container.querySelector('[data-testid="current-url"]').textContent).toBe(placesApi.placeDetailLink(place.id));
    expect(fixture.container.querySelector<HTMLAnchorElement>('a[href*="toPlaceId"]').search).toContain("confirmPlace=1");
    expect(fixture.container.textContent).not.toContain("Back to places");
    expect(fixture.container.querySelector<HTMLAnchorElement>('.transit-detail-back').getAttribute("href")).toBe("/nearby/places");
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>('.transit-detail-back').click());
    expect(fixture.container.querySelector(".transit-nearby-launcher")).toBeNull();
    expect(fixture.container.querySelector("#selected-place-heading")).toBeNull();
    expect(fixture.container.querySelector(".transit-places-list")).not.toBeNull();
    await act(async () => button("Browser back").click());
    expect(fixture.container.querySelector("#selected-place-heading").textContent).toBe("Example Park");
    await act(async () => button("Browser forward").click());
    expect(fixture.container.querySelector("#selected-place-heading")).toBeNull();
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>(".transit-place-result").click());
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>('a[href*="toPlaceId"]').click());
    expect(fixture.container.querySelector<HTMLAnchorElement>('.transit-detail-back').getAttribute("href")).toBe(placesApi.placeDetailLink(place.id));
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>('.transit-detail-back').click());
    expect(fixture.container.querySelector("#selected-place-heading").textContent).toBe("Example Park");
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>('.transit-detail-back').click());
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>('.transit-detail-back').click());
    expect(fixture.container.querySelector(".transit-nearby-launcher")).not.toBeNull();
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>('.transit-nearby-tile[href="/nearby/planner"]').click());
    expect(fixture.container.textContent).not.toContain("Places nearby");
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>('.transit-detail-back').click());
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>('.transit-nearby-tile[href="/nearby/places"]').click());
    expect(fixture.container.querySelector("#selected-place-heading")).toBeNull();
    expect(fixture.container.querySelector<HTMLInputElement>('.transit-places-category--food-cart-pod input').checked).toBe(false);
    expect(neighborhoodToggle().checked).toBe(true);
    expect(polygonToggle().checked).toBe(true);
    expect(map.jumpTo).toHaveBeenCalled();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["park", "portland:park:1"],
    ["food-cart-pod", "osm:way:2"],
    ["community-center", "metro:community-center:13"],
    ["library", "metro:library:central-library"],
    ["community-garden", "portland:garden:37d4ec75-92b5-47dd-8b36-b8717e7a2cc5"],
    ["farmers-market", "portland:market:1"],
    ["public-restroom", "portland:restroom:300"],
    ["heritage-tree", "portland:tree:14"],
    ["grocery-store", "portland:grocery:1"],
    ["reuse-repair", "portland:reuse:1"],
    ["csa-pickup", "portland:csa:1"],
    ["bicycle-parking", "portland:bike:5220-1"],
    ["drinking-fountain", "portland:drinking-fountain:1"],
    ["picnic-seating", "portland:picnic-seating:2"],
    ["park-artwork", "portland:park-artwork:3"],
    ["museum", "osm:museum:node:4"],
    ["art-gallery", "osm:art-gallery:way:5"],
    ["theatre", "osm:theatre:relation:6"],
    ["arts-centre", "osm:arts-centre:node:7"],
    ...placesApi.OUTING_PLACE_CATEGORIES.map(category => [category, `osm:${category}:way:123`] as const)
  ] as const)("opens a directly linked %s independently of GPS and returns to Places using only the header", async (category, id) => {
    const place: placesApi.InterestPlace = { id, category, name: "Directly linked place",
      coordinates: [-122.67, 45.52], arrival: "approximate", sourceUrl: "https://www.portlandmaps.com/" };
    const snapshot: placesApi.PlaceSnapshot = {
      version: 1, category, retrievedAt: "2026-11-19T12:00:00Z", source: "Test", sourceUrl: place.sourceUrl,
      license: "Test", licenseUrl: place.sourceUrl, coverage: "Test", places: [place]
    };
    vi.spyOn(placesApi, "usePlaceCatalog").mockReturnValue({ places: [place],
      sources: { ...placesApi.emptyPlaceSources(), [category]: { snapshot, loading: false, error: false } }, retry: vi.fn() });
    await render(placesApi.placeDetailLink(id));
    finishMapLoading();
    expect(fixture.container.querySelector("#selected-place-heading").textContent).toBe(place.name);
    expect(fixture.container.querySelector<HTMLAnchorElement>('a[href*="toPlaceId"]').search).toContain("confirmPlace=1");
    expect(fixture.container.textContent).not.toContain("Back to places");
    expect(map.jumpTo).toHaveBeenCalledWith({ center: place.coordinates, zoom: 15 });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    await act(async () => fixture.container.querySelector<HTMLAnchorElement>('.transit-detail-back').click());
    expect(fixture.container.querySelector(".transit-places-list")).not.toBeNull();
    expect(fixture.container.querySelector("#selected-place-heading")).toBeNull();
    expect(fixture.container.querySelector(".transit-nearby-launcher")).toBeNull();
  });

  it("keeps a direct place route while loading and retrying, then reports an absent place without opening the list", async () => {
    const retry = vi.fn();
    const catalog = vi.spyOn(placesApi, "usePlaceCatalog");
    catalog.mockReturnValue({ places: [], sources: { ...placesApi.emptyPlaceSources(),
      park: { loading: true, error: false } }, retry });
    const path = placesApi.placeDetailLink("portland:park:99999");
    await render(path);
    expect(fixture.container.textContent).toContain("Loading place details");
    expect(fixture.container.querySelector(".transit-places-list")).toBeNull();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    catalog.mockReturnValue({ places: [], sources: { ...placesApi.emptyPlaceSources(),
      park: { loading: false, error: true } }, retry });
    await render(path);
    expect(fixture.container.textContent).toContain("This place could not be loaded");
    await act(async () => button("Retry place").click());
    expect(retry).toHaveBeenCalledWith("park");
    const snapshot: placesApi.PlaceSnapshot = { version: 1, category: "park", retrievedAt: "2026-11-19T12:00:00Z",
      source: "Test", sourceUrl: "https://www.portlandmaps.com/", license: "Test",
      licenseUrl: "https://www.portlandmaps.com/", coverage: "Test", places: [] };
    catalog.mockReturnValue({ places: [], sources: { ...placesApi.emptyPlaceSources(),
      park: { snapshot, loading: false, error: false } }, retry });
    await render(path);
    expect(fixture.container.textContent).toContain("Place not found");
    expect(fixture.container.querySelector(".transit-places-list")).toBeNull();
    expect(fixture.container.querySelector('[data-testid="current-url"]').textContent).toBe(path);
    expect(fixture.container.querySelector<HTMLAnchorElement>('.transit-detail-back').getAttribute("href")).toBe("/nearby/places");
  });
});
