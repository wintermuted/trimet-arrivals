import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import {
  CULTURE_PLACE_CATEGORIES, OUTING_PLACE_CATEGORIES, OSM_PLACE_CATEGORIES, DEFAULT_PLACE_FILTERS, emptyPlaceSources, filterPlaces, InterestPlace, parsePlaceSnapshot, placeCategoryForId, PLACE_CATEGORIES,
  placeDetailLink, placeInBounds, placePlannerLink, PlaceSnapshot, usePlaceCatalog
} from "@trimet-arrivals/places/catalog";
import { Popup } from "mapbox-gl";
import NearbyPlaces from "../view/nearby/components/NearbyPlaces";
import PlacesHelp from "../view/nearby/components/PlacesHelp";
import NearbyPlacesMap, { placeFeatures } from "../view/nearby/components/NearbyPlacesMap";
import NearbyNeighborhoodsMap, { NEIGHBORHOOD_LAYERS, NEIGHBORHOOD_SOURCE } from "../view/nearby/components/NearbyNeighborhoodsMap";
import { NeighborhoodSnapshot, parseNeighborhoodSnapshot, useNeighborhoods } from "@trimet-arrivals/places/neighborhoods";
import { DEFAULT_LINE_OVERLAYS, LINE_CAUTION_COLOR, LineOverlayCategory, LineOverlaySnapshot,
  parseLineOverlaySnapshot, useLineOverlay } from "@trimet-arrivals/places/lineOverlays";
import NearbyLineOverlayMap, { lineOverlaySource } from "../view/nearby/components/NearbyLineOverlayMap";
jest.mock("../view/nearby/util/mapbox/placeIcons", () => ({
  ...jest.requireActual("../view/nearby/util/mapbox/placeIcons"),
  createPlaceIconImage: jest.fn(() => ({ width: 48, height: 48, data: new Uint8Array(48 * 48 * 4) }))
}));
jest.mock("mapbox-gl", () => ({ Popup: jest.fn() }));

const park: InterestPlace = {
  id: "portland:park:1", name: "Example Park", category: "park", coordinates: [-122.67, 45.52],
  arrival: "approximate", sourceUrl: "https://www.portlandmaps.com/"
};
const pod: InterestPlace = {
  id: "osm:way:2", name: "Example Food Carts", category: "food-cart-pod", coordinates: [-122.68, 45.53],
  arrival: "approximate", sourceUrl: "https://www.openstreetmap.org/way/2"
};
const garden: InterestPlace = {
  ...park, id: "portland:garden:37d4ec75-92b5-47dd-8b36-b8717e7a2cc5",
  name: "Example Community Garden", category: "community-garden", parkPropertyId: 1
};
const market: InterestPlace = {
  ...pod, id: "portland:market:1", name: "Example Farmers Market", category: "farmers-market",
  marketDays: "Saturday", marketSeason: "May - October", marketHours: "9 a.m. - 1 p.m."
};
const restroom: InterestPlace = {
  ...park, id: "portland:restroom:1", name: "Example Park - Restroom A - Room 1", category: "public-restroom",
  restroomStatus: "listed-24-7", restroomAda: "unknown"
};
const tree: InterestPlace = {
  ...park, id: "portland:tree:51", name: "Oregon white oak (Heritage Tree #51)", category: "heritage-tree",
  scientificName: "Quercus garryana", treeOwnership: "Private, Front Yard"
};
const everydayPlaces: InterestPlace[] = [
  { ...park, id: "portland:grocery:1", name: "Example Grocer", category: "grocery-store" },
  { ...park, id: "portland:reuse:1", name: "Example Reuse", category: "reuse-repair",
    reuseServices: "Lending Library", reuseItems: "Tools" },
  { ...park, id: "portland:csa:1", name: "Example Farm", category: "csa-pickup",
    pickupSeason: "June - November", pickupProducts: "vegetables" },
  { ...park, id: "portland:bike:5220-1", name: "Bicycle rack 5220-1", category: "bicycle-parking",
    bikeSpaces: 2, bikeCovered: "yes" }
];
const amenities: InterestPlace[] = [
  { ...park, id: "portland:drinking-fountain:1", category: "drinking-fountain",
    amenityType: "Drinking Fountain", amenityStyle: "Dog Bowl" },
  { ...park, id: "portland:picnic-seating:2", category: "picnic-seating", amenityType: "Bench" },
  { ...park, id: "portland:park-artwork:3", category: "park-artwork", amenityType: "Art Work" }
];
const culturalPlaces: InterestPlace[] = CULTURE_PLACE_CATEGORIES.map((category, i) => ({
  ...pod, id: `osm:${category}:node:${i + 1}`, category, name: `Example ${category}`
}));
const outingPlaces: InterestPlace[] = OUTING_PLACE_CATEGORIES.map((category, i) => ({
  ...pod, id: `osm:${category}:way:${i + 1}`, category, name: `Example ${category}`, siteType: "Example source type"
}));
const snapshot: PlaceSnapshot = {
  version: 1, category: "park", retrievedAt: "2026-11-18T12:00:00Z",
  source: "City of Portland", sourceUrl: "https://www.portlandmaps.com/",
  license: "PDDL-1.0", licenseUrl: "https://opendatacommons.org/licenses/pddl/1-0/",
  coverage: "Test parks", places: [park]
};
const neighborhoodSnapshot: NeighborhoodSnapshot = {
  type: "FeatureCollection", version: 1, retrievedAt: snapshot.retrievedAt,
  source: snapshot.source, sourceUrl: snapshot.sourceUrl, license: snapshot.license,
  licenseUrl: snapshot.licenseUrl, coverage: "Neighborhood bylaw boundaries, including shared areas",
  features: [{ type: "Feature", id: "portland:neighborhood:1", properties: { name: "Example", shared: false, areaId: 1 },
    geometry: { type: "Polygon", coordinates: [[[-122.7, 45.5], [-122.6, 45.5], [-122.6, 45.6], [-122.7, 45.5]]] } }]
};
const overlaySnapshot = (category: LineOverlayCategory): LineOverlaySnapshot => ({
  ...neighborhoodSnapshot, category,
  features: [{ type: "Feature", id: `portland:${category}:1`,
    properties: { name: "Example line", kind: "standard", detail: "Source-listed facility" },
    geometry: { type: "LineString", coordinates: [[-122.7, 45.5], [-122.69, 45.51]] } }]
});

describe("Places filtering, selection and map layers", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    jest.mocked(Popup).mockImplementation(() => ({
      setLngLat: jest.fn().mockReturnThis(), setDOMContent: jest.fn().mockReturnThis(),
      addTo: jest.fn().mockReturnThis(), remove: jest.fn()
    } as never));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("positions Places help over the map, adapting from beside the sidebar to the stacked mobile map", () => {
    let mobile = false;
    const bounds = (x: number, y: number, width: number, height: number): DOMRect => ({
      x, y, width, height, left: x, top: y, right: x + width, bottom: y + height,
      toJSON: () => ({ x, y, width, height })
    });
    const measure = jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      if (this.classList.contains("transit-nearby-map-stage")) {
        return mobile ? bounds(0, 350, 390, 240) : bounds(288, 54, 700, 700);
      }
      if (this.getAttribute("role") === "tooltip") return bounds(0, 0, 320, 100);
      return mobile ? bounds(327, 200, 34, 24) : bounds(225, 200, 34, 24);
    });
    try {
      act(() => root.render(<div className="transit-nearby-layout">
        <PlacesHelp label="park trails" text="Trail access is not verified." />
        <div className="transit-nearby-map-stage" />
      </div>));
      const button = container.querySelector("button");
      act(() => button.focus());
      const tooltip = document.querySelector<HTMLElement>('[role="tooltip"]');
      expect(tooltip.style.left).toBe("296px");
      expect(tooltip.style.top).toBe("200px");
      mobile = true;
      act(() => window.dispatchEvent(new Event("resize")));
      expect(tooltip.style.left).toBe("41px");
      expect(tooltip.style.top).toBe("358px");
      act(() => document.body.dispatchEvent(new Event("pointerdown", { bubbles: true })));
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
    } finally {
      measure.mockRestore();
    }
  });

  it("collapses controls independently without changing filters and retains disclosure state through details", async () => {
    function Harness() {
      const [filters, setFilters] = React.useState(DEFAULT_PLACE_FILTERS);
      const [selected, setSelected] = React.useState<InterestPlace>();
      return <MemoryRouter>
        <button onClick={() => setSelected(selected ? undefined : park)}>Toggle detail</button>
        <NearbyPlaces sources={{ ...emptyPlaceSources(), park: { snapshot, loading: false, error: false } }}
          filters={filters} onFilters={setFilters} visiblePlaces={[park]} selected={selected}
          onSelect={jest.fn()} onRetry={jest.fn()} mapReady mapError={false}
          discovery={<button>Discovery action</button>}
          neighborhoods={{ shown: true, onShown: jest.fn(), polygonsShown: false, onPolygonsShown: jest.fn(),
            loading: false, error: true, mapError: false, onRetry: jest.fn() }} />
      </MemoryRouter>;
    }
    await act(async () => root.render(<Harness />));
    const disclosures = () => [...container.querySelectorAll<HTMLDetailsElement>(".transit-places-section")];
    expect(disclosures().map(section => section.querySelector("summary").firstChild.textContent))
      .toEqual(["Discovery tools", "Place categories", "Map layers"]);
    expect(disclosures().every(section => !section.open)).toBe(true);
    expect(container.querySelector('input[type="search"]').closest("details")).toBeNull();
    expect(container.querySelector(".transit-places-list").closest("details")).toBeNull();
    expect(container.querySelector('[role="alert"]').closest("summary").textContent).toContain("Map layers");
    expect(container.querySelector(".transit-places-message")).toBeNull();
    await act(async () => {
      disclosures()[1].open = true;
      disclosures()[1].dispatchEvent(new Event("toggle"));
    });
    await act(async () => container.querySelector<HTMLInputElement>(".transit-places-category--park input").click());
    await act(async () => container.querySelector<HTMLButtonElement>(".transit-places-group-toggle").click());
    expect(disclosures().map(section => section.open)).toEqual([false, true, false]);
    await act(async () => {
      disclosures()[1].open = false;
      disclosures()[1].dispatchEvent(new Event("toggle"));
      disclosures()[2].open = true;
      disclosures()[2].dispatchEvent(new Event("toggle"));
    });
    expect(container.querySelector<HTMLInputElement>(".transit-places-category--park input").checked).toBe(false);
    const detail = () => container.querySelector<HTMLButtonElement>("button");
    await act(async () => detail().click());
    expect(disclosures()).toHaveLength(0);
    await act(async () => detail().click());
    expect(disclosures().map(section => section.open)).toEqual([false, false, true]);
    expect(container.querySelector(".transit-places-group-toggle").getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector<HTMLInputElement>(".transit-places-category--park input").checked).toBe(false);
    expect(container.querySelector<HTMLInputElement>(".transit-places-map-layers input").checked).toBe(true);
  });

  it("validates category data, rejects duplicates, invalid coordinates and unsafe URLs", () => {
    expect(parsePlaceSnapshot(snapshot, "park").places).toEqual([park]);
    expect(() => parsePlaceSnapshot({ ...snapshot, places: [park, park] }, "park")).toThrow();
    expect(() => parsePlaceSnapshot({ ...snapshot, places: [{ ...park, coordinates: [45.52, -122.67] }] }, "park")).toThrow();
    expect(() => parsePlaceSnapshot({ ...snapshot, places: [{ ...park, website: "javascript:alert(1)" }] }, "park")).toThrow();
  });

  it("distinguishes cultural identities from existing food-pod IDs and rejects invalid category-qualified identities", () => {
    for (const place of culturalPlaces) {
      expect(placeCategoryForId(place.id)).toBe(place.category);
      expect(parsePlaceSnapshot({ ...snapshot, category: place.category, places: [place] }, place.category).places).toEqual([place]);
      expect(filterPlaces([place], DEFAULT_PLACE_FILTERS)).toEqual([place]);
    }
    expect(placeCategoryForId("osm:node:1")).toBe("food-cart-pod");
    for (const id of ["osm:museum:node:0", "osm:museum:node:9007199254740992", "osm:unknown:node:1", "osm:museum:building:1"]) {
      expect(placeCategoryForId(id)).toBeUndefined();
    }
    expect(() => parsePlaceSnapshot({ ...snapshot, category: "museum",
      places: [{ ...culturalPlaces[0], id: "osm:art-gallery:node:1" }] }, "museum")).toThrow();
  });

  it("validates and searches every outing category while leaving cafes and bakeries opt-in", () => {
    for (const place of outingPlaces) {
      expect(placeCategoryForId(place.id)).toBe(place.category);
      expect(parsePlaceSnapshot({ ...snapshot, category: place.category, places: [place] }, place.category).places).toEqual([place]);
      expect(filterPlaces([place], { ...DEFAULT_PLACE_FILTERS, [place.category]: true, search: "source type" })).toEqual([place]);
    }
    expect(filterPlaces(outingPlaces, DEFAULT_PLACE_FILTERS).map(place => place.category)).not.toEqual(
      expect.arrayContaining(["cafe", "bakery"]));
    expect(DEFAULT_PLACE_FILTERS.cafe).toBe(false);
    expect(DEFAULT_PLACE_FILTERS.bakery).toBe(false);
    expect(() => parsePlaceSnapshot({ ...snapshot, places: [{ ...park, siteType: "mural" }] }, "park")).toThrow();
    expect(() => parsePlaceSnapshot({ ...snapshot, category: "viewpoint",
      places: [{ ...outingPlaces[0], siteType: 123 }] }, "viewpoint")).toThrow();
  });

  it("retries only the requested failed place source and retains its last snapshot on a subsequent failure", async () => {
    const originalFetch = global.fetch;
    const fetch = jest.fn().mockRejectedValue(new Error("Unavailable source"));
    global.fetch = fetch;
    let catalog: ReturnType<typeof usePlaceCatalog>;
    function Harness() {
      catalog = usePlaceCatalog(true);
      return null;
    }
    try {
      await act(async () => root.render(<Harness />));
      expect(fetch).toHaveBeenCalledTimes(PLACE_CATEGORIES.length);
      expect(catalog.sources.playground.error).toBe(true);
      const place = outingPlaces.find(place => place.category === "playground");
      const loaded = { ...snapshot, category: place.category, places: [place] };
      fetch.mockResolvedValueOnce({ ok: true, json: async () => loaded });
      await act(async () => catalog.retry("playground"));
      expect(fetch).toHaveBeenCalledTimes(PLACE_CATEGORIES.length + 1);
      expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining("/data/places/playgrounds.json"),
        expect.objectContaining({ cache: "reload" }));
      expect(catalog.sources.playground.snapshot.places).toEqual([place]);
      expect(catalog.sources.cafe.error).toBe(true);
      await act(async () => catalog.retry("playground"));
      expect(catalog.sources.playground.error).toBe(true);
      expect(catalog.sources.playground.snapshot.places).toEqual([place]);
      expect(fetch).toHaveBeenCalledTimes(PLACE_CATEGORIES.length + 2);
    } finally { global.fetch = originalFetch; }
  });

  it("deduplicates equivalent named park/art destinations without hiding separate assets, disabled-source alternatives or saved records", () => {
    const reserve: InterestPlace = { ...park, id: "osm:nature-reserve:way:2", category: "nature-reserve" };
    const artwork: InterestPlace = { ...park, id: "portland:park-artwork:3", category: "park-artwork", name: "Example Sculpture" };
    const osmArt: InterestPlace = { ...artwork, id: "osm:public-art:node:4", category: "public-art" };
    const otherArt: InterestPlace = { ...osmArt, id: "osm:public-art:node:5", name: "Separate mural" };
    const farReserve: InterestPlace = { ...reserve, id: "osm:nature-reserve:way:6", coordinates: [-122.6, 45.52] };
    expect(filterPlaces([park, reserve, artwork, osmArt, otherArt, farReserve], DEFAULT_PLACE_FILTERS))
      .toEqual([park, artwork, otherArt, farReserve]);
    expect(filterPlaces([park, reserve], { ...DEFAULT_PLACE_FILTERS, park: false })).toEqual([reserve]);
    expect(filterPlaces([artwork, osmArt], { ...DEFAULT_PLACE_FILTERS, "park-artwork": false })).toEqual([osmArt]);
    expect(filterPlaces([park, reserve], DEFAULT_PLACE_FILTERS, false)).toEqual([park, reserve]);
  });

  it("keeps source errors beside collapsed sections, groups and category rows with exact-message tooltips and isolated retries", async () => {
    const retry = jest.fn(), onFilters = jest.fn();
    const sources = { ...emptyPlaceSources(), cafe: { loading: false, error: true } };
    await act(async () => root.render(<MemoryRouter><NearbyPlaces sources={sources} filters={DEFAULT_PLACE_FILTERS}
      onFilters={onFilters} visiblePlaces={[]} onSelect={jest.fn()} onRetry={retry} mapReady mapError={false} /></MemoryRouter>));
    const section = container.querySelector<HTMLDetailsElement>("details");
    const summaryRetry = section.querySelector<HTMLButtonElement>('summary button[aria-label="Retry place categories"]');
    await act(async () => summaryRetry.click());
    expect(retry).toHaveBeenLastCalledWith("cafe");
    expect(section.open).toBe(false);
    await act(async () => { section.open = true; section.dispatchEvent(new Event("toggle")); });
    const group = [...container.querySelectorAll(".transit-places-category-group")]
      .find(el => el.querySelector("legend").textContent === "Food & markets");
    const groupRetry = group.querySelector<HTMLButtonElement>('button[aria-label="Retry food & markets"]');
    await act(async () => groupRetry.click());
    expect(group.querySelector("button[aria-expanded]").getAttribute("aria-expanded")).toBe("false");
    await act(async () => group.querySelector<HTMLButtonElement>("button[aria-expanded]").click());
    const row = group.querySelector(".transit-places-category--cafe").closest(".transit-places-layer-row");
    const error = row.querySelector<HTMLButtonElement>('button[aria-label="Cafés error"]');
    await act(async () => error.focus());
    expect(document.querySelector('[role="tooltip"]').textContent)
      .toBe("Cafés could not be loaded. Other available places remain usable.");
    expect(error.closest("label")).toBeNull();
    await act(async () => row.querySelector<HTMLButtonElement>('button[aria-label="Retry cafés"]').click());
    expect(retry).toHaveBeenCalledTimes(3);
    expect(onFilters).not.toHaveBeenCalled();
    expect(container.querySelector(".transit-places-message")).toBeNull();
  });

  it("shows a layer's retained-snapshot or drawing failure only at its row and exposes a real marker retry", async () => {
    const retry = jest.fn(), retryMap = jest.fn();
    const sources = {
      "park-trails": { loading: false, error: true, snapshot: overlaySnapshot("park-trails"), retry: jest.fn() },
      "bicycle-network": { loading: false, error: false, retry: jest.fn() },
      "recommended-bike-routes": { loading: false, error: false, retry: jest.fn() }
    };
    await act(async () => root.render(<MemoryRouter><NearbyPlaces sources={emptyPlaceSources()} filters={DEFAULT_PLACE_FILTERS}
      onFilters={jest.fn()} visiblePlaces={[]} onSelect={jest.fn()} onRetry={jest.fn()} mapReady mapError onRetryMap={retryMap}
      neighborhoods={{ shown: false, onShown: jest.fn(), polygonsShown: false, onPolygonsShown: jest.fn(),
        loading: false, error: false, mapError: false, onRetry: jest.fn() }}
      lineOverlays={{ shown: { ...DEFAULT_LINE_OVERLAYS, "park-trails": true }, sources,
        mapErrors: DEFAULT_LINE_OVERLAYS, onShown: jest.fn(), onRetry: retry }} /></MemoryRouter>));
    const markerRetry = container.querySelector<HTMLButtonElement>('button[aria-label="Retry place categories"]');
    await act(async () => markerRetry.click());
    expect(retryMap).toHaveBeenCalledTimes(1);
    const layerRetry = container.querySelector<HTMLButtonElement>('button[aria-label="Retry map layers"]');
    await act(async () => layerRetry.click());
    expect(retry).toHaveBeenCalledWith("park-trails");
    const row = container.querySelector('button[aria-label="Park trails error"]').closest(".transit-places-layer-row");
    await act(async () => row.querySelector<HTMLButtonElement>('button[aria-label="Park trails error"]').focus());
    expect(document.querySelector('[role="tooltip"]').textContent)
      .toBe("Park trails could not be loaded. Other map layers and places remain usable. The previously loaded snapshot is still shown.");
    expect(container.querySelector(".transit-places-message")).toBeNull();
  });

  it("bulk toggles nested category groups and derives mixed state from children and external filters", () => {
    let updateFilters: React.Dispatch<React.SetStateAction<typeof DEFAULT_PLACE_FILTERS>>;
    let currentFilters = { ...DEFAULT_PLACE_FILTERS, search: "garden" };
    function Harness() {
      const [filters, setFilters] = React.useState(currentFilters);
      updateFilters = setFilters;
      currentFilters = filters;
      return <MemoryRouter><NearbyPlaces sources={emptyPlaceSources()} filters={filters} onFilters={setFilters}
        visiblePlaces={[]} onSelect={jest.fn()} onRetry={jest.fn()} mapReady mapError={false} /></MemoryRouter>;
    }
    act(() => root.render(<Harness />));
    const groups = [...container.querySelectorAll<HTMLFieldSetElement>(".transit-places-category-group")];
    expect(groups.map(group => group.querySelector("legend").textContent))
      .toEqual(["Parks & nature", "Food & markets", "Community & resources", "Arts & culture", "Play & recreation", "Trip amenities"]);
    const childCategories = [...container.querySelectorAll(".transit-places-group-children label")]
      .map(label => PLACE_CATEGORIES.find(category => label.classList.contains(`transit-places-category--${category}`)));
    expect([...childCategories].sort()).toEqual([...PLACE_CATEGORIES].sort());
    for (const group of groups) {
      const toggle = group.querySelector<HTMLInputElement>(".transit-places-group-header input");
      const disclosure = group.querySelector<HTMLButtonElement>(".transit-places-group-toggle");
      const childRegion = group.querySelector<HTMLDivElement>(".transit-places-group-children");
      expect(disclosure.getAttribute("aria-expanded")).toBe("false");
      expect(disclosure.getAttribute("aria-controls")).toBe(childRegion.id);
      expect(childRegion.hidden).toBe(true);
      const children = [...group.querySelectorAll<HTMLInputElement>(".transit-places-group-children input")];
      const before = currentFilters;
      const expected = { ...before };
      for (const category of PLACE_CATEGORIES) {
        if (group.querySelector(`.transit-places-category--${category}`)) expected[category] = true;
      }
      if (toggle.checked) act(() => toggle.click());
      act(() => toggle.click());
      expect(currentFilters).toEqual(expected);
      expect(childRegion.hidden).toBe(true);
      const beforeExpansion = currentFilters;
      act(() => disclosure.click());
      expect(currentFilters).toEqual(beforeExpansion);
      expect(disclosure.getAttribute("aria-expanded")).toBe("true");
      expect(childRegion.hidden).toBe(false);
      expect(children.every(input => input.checked)).toBe(true);
      expect(toggle.indeterminate).toBe(false);
      act(() => children[0].click());
      expect(toggle.checked).toBe(false);
      expect(toggle.indeterminate).toBe(true);
      act(() => toggle.click());
      expect(children.every(input => input.checked)).toBe(true);
      act(() => toggle.click());
      expect(children.every(input => !input.checked)).toBe(true);
      expect(toggle.checked).toBe(false);
      expect(toggle.indeterminate).toBe(false);
      act(() => disclosure.click());
      expect(childRegion.hidden).toBe(true);
      expect(currentFilters.search).toBe("garden");
    }
    act(() => updateFilters({ ...DEFAULT_PLACE_FILTERS, search: "garden" }));
    const amenitiesToggle = groups.find(group => group.querySelector("legend").textContent === "Trip amenities")
      .querySelector<HTMLInputElement>(".transit-places-group-header input");
    expect(amenitiesToggle.checked).toBe(false);
    expect(amenitiesToggle.indeterminate).toBe(true);
    expect(currentFilters.search).toBe("garden");
  });

  it.each([
    require("../../public/data/places/park-trails.json"),
    require("../../public/data/places/bicycle-network.json"),
    require("../../public/data/places/recommended-bike-routes.json")
  ])("validates all published $category segments and rejects wrong geometries, categories and identities", data => {
    expect(parseLineOverlaySnapshot(data, data.category).features).toHaveLength(data.features.length);
    const example = overlaySnapshot(data.category);
    expect(() => parseLineOverlaySnapshot({ ...example, features: [...example.features, ...example.features] }, data.category)).toThrow();
    expect(() => parseLineOverlaySnapshot({ ...example,
      features: [{ ...example.features[0], geometry: { type: "Point", coordinates: park.coordinates } }] }, data.category)).toThrow();
    expect(() => parseLineOverlaySnapshot({ ...example,
      features: [{ ...example.features[0], id: "portland:park:1" }] }, data.category)).toThrow();
  });

  it.each(["park-trails", "bicycle-network", "recommended-bike-routes"] as const)(
    "loads %s only when enabled and retries failures independently", async category => {
      const originalFetch = global.fetch;
      const fetch = jest.fn().mockRejectedValueOnce(new Error("network"))
        .mockResolvedValue({ ok: true, json: async () => overlaySnapshot(category) });
      global.fetch = fetch;
      function Harness({ enabled }: { enabled: boolean }) {
        const state = useLineOverlay(category, enabled);
        return <button onClick={state.retry}>{state.error ? "Failed" : state.snapshot ? "Loaded" : "Waiting"}</button>;
      }
      try {
        await act(async () => root.render(<Harness enabled={false} />));
        expect(fetch).not.toHaveBeenCalled();
        await act(async () => root.render(<Harness enabled />));
        expect(container.textContent).toBe("Failed");
        await act(async () => container.querySelector("button").click());
        expect(container.textContent).toBe("Loaded");
        expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining(`/data/places/${category}.json`),
          expect.objectContaining({ cache: "reload" }));
        await act(async () => root.render(<Harness enabled={false} />));
        expect(fetch).toHaveBeenCalledTimes(2);
      } finally { global.fetch = originalFetch; }
    });

  it("keeps line controls, legends and retries independent of place filters and neighborhood loading", () => {
    const onFilters = jest.fn(), onShown = jest.fn(), onRetry = jest.fn();
    const sources = {
      "park-trails": { loading: true, error: false, retry: jest.fn() },
      "bicycle-network": { loading: false, error: true, retry: jest.fn() },
      "recommended-bike-routes": { loading: false, error: false, retry: jest.fn() }
    };
    act(() => root.render(<MemoryRouter><NearbyPlaces sources={emptyPlaceSources()}
      filters={DEFAULT_PLACE_FILTERS} onFilters={onFilters} visiblePlaces={[park]} onSelect={jest.fn()}
      onRetry={jest.fn()} mapReady mapError={false}
      neighborhoods={{ shown: false, onShown: jest.fn(), polygonsShown: false, onPolygonsShown: jest.fn(),
        loading: false, error: false, mapError: false, onRetry: jest.fn() }}
      lineOverlays={{ shown: { "park-trails": true, "bicycle-network": true, "recommended-bike-routes": true },
        sources, mapErrors: DEFAULT_LINE_OVERLAYS, onShown, onRetry }}
    /></MemoryRouter>));
    expect(container.querySelector('[role="status"][aria-label="Loading park trails..."]')).not.toBeNull();
    expect(container.textContent).toContain("Bicycle network could not be loaded");
    expect(container.querySelector("#place-line-overlay-help")).toBeNull();
    const help = container.querySelector<HTMLButtonElement>('button[aria-label="About recommended bike routes"]');
    expect(help.closest("label")).toBeNull();
    act(() => help.focus());
    const tooltip = document.querySelector('[role="tooltip"]');
    expect(container.contains(tooltip)).toBe(false);
    expect(tooltip.textContent).toContain("Optional reference lines, not turn-by-turn routes");
    expect(tooltip.textContent).toContain("Red dashes: difficult, higher-traffic or unclassified connections");
    expect(help.getAttribute("aria-describedby")).toBe(tooltip.id);
    expect(onShown).not.toHaveBeenCalled();
    act(() => help.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(container.querySelector(".transit-place-result")).not.toBeNull();
    const toggle = container.querySelector<HTMLInputElement>(".transit-places-line-toggle input");
    act(() => toggle.click());
    expect(onShown).toHaveBeenCalledWith("park-trails", false);
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Retry bicycle network"]').click());
    expect(onRetry).toHaveBeenCalledWith("bicycle-network");
    expect(onFilters).not.toHaveBeenCalled();
  });

  it("orders line overlays below POIs, restores after style reload, surfaces draw failures and cleans up its own layers", () => {
    const category = "recommended-bike-routes";
    const source = lineOverlaySource(category);
    const sources = new Set<string>();
    const layers = new Set<string>(["nearby-places-park-points"]);
    const listeners = new Map<string, (event?: { error: Error; sourceId: string }) => void>();
    const map = {
      getSource: jest.fn(id => sources.has(id)), addSource: jest.fn(id => sources.add(id)),
      getLayer: jest.fn(id => layers.has(id)), addLayer: jest.fn((layer, _before?: string) => layers.add(layer.id)),
      getStyle: () => ({ layers: [...layers].map(id => ({ id })) }),
      on: jest.fn((name, handler) => listeners.set(name, handler)), off: jest.fn(),
      removeLayer: jest.fn(id => layers.delete(id)), removeSource: jest.fn(id => sources.delete(id))
    };
    const onError = jest.fn();
    const data = overlaySnapshot(category);
    act(() => root.render(<NearbyLineOverlayMap map={map as never} snapshot={data} onError={onError} />));
    expect(map.addLayer.mock.calls.every(call => call[1] === "nearby-places-park-points")).toBe(true);
    for (const [layer] of map.addLayer.mock.calls) {
      expect(layer.paint["line-width"][0]).toBe("interpolate");
      expect(layer.paint["line-width"][2]).toEqual(["zoom"]);
    }
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: source + "-caution",
      filter: ["==", ["get", "kind"], "caution"],
      paint: expect.objectContaining({ "line-color": LINE_CAUTION_COLOR, "line-dasharray": [2, 1], "line-emissive-strength": 1 })
    }), "nearby-places-park-points");
    act(() => listeners.get("error")({ error: new Error("worker failure"), sourceId: source }));
    expect(onError).toHaveBeenLastCalledWith(category, true);
    layers.clear(); layers.add("nearby-places-park-points"); sources.clear();
    act(() => listeners.get("style.load")());
    expect(onError).toHaveBeenLastCalledWith(category, false);
    expect(sources.has(source)).toBe(true);
    act(() => root.render(null));
    expect(sources.size).toBe(0);
    expect([...layers]).toEqual(["nearby-places-park-points"]);
    expect(map.off).toHaveBeenCalledWith("style.load", expect.any(Function));
    expect(map.off).toHaveBeenCalledWith("error", expect.any(Function));
    map.addLayer.mockImplementation(() => layers);
    act(() => root.render(<NearbyLineOverlayMap map={map as never} snapshot={data} onError={onError} />));
    expect(onError).toHaveBeenLastCalledWith(category, true);
    act(() => root.render(null));
    map.addSource.mockImplementation(() => { throw new Error("draw failed"); });
    act(() => root.render(<NearbyLineOverlayMap map={map as never} snapshot={data} onError={onError} />));
    expect(onError).toHaveBeenLastCalledWith(category, true);
  });

  it("validates neighborhood polygons and rejects malformed geometry or duplicate IDs", () => {
    expect(parseNeighborhoodSnapshot(neighborhoodSnapshot)).toEqual(neighborhoodSnapshot);
    expect(() => parseNeighborhoodSnapshot({ ...neighborhoodSnapshot,
      features: [...neighborhoodSnapshot.features, ...neighborhoodSnapshot.features] })).toThrow();
    expect(() => parseNeighborhoodSnapshot({ ...neighborhoodSnapshot,
      features: [{ ...neighborhoodSnapshot.features[0], geometry: { type: "Point", coordinates: [-122.67, 45.52] } }] })).toThrow();
    expect(() => parseNeighborhoodSnapshot({ ...neighborhoodSnapshot,
      features: [{ ...neighborhoodSnapshot.features[0], geometry: { type: "Polygon", coordinates: [[[1, 2], [3, 4], [5, 6], [1, 2]]] } }] })).toThrow();
  });

  it("keeps the neighborhood toggle and retry independent of place categories and results", () => {
    const onFilters = jest.fn();
    const onShown = jest.fn();
    const onPolygonsShown = jest.fn();
    const onRetry = jest.fn();
    act(() => root.render(<MemoryRouter><NearbyPlaces sources={emptyPlaceSources()}
      filters={DEFAULT_PLACE_FILTERS} onFilters={onFilters} visiblePlaces={[park]} onSelect={jest.fn()}
      onRetry={jest.fn()} mapReady mapError={false}
      neighborhoods={{ shown: true, onShown, polygonsShown: false, onPolygonsShown,
        loading: false, error: true, mapError: false, onRetry }}
    /></MemoryRouter>));
    const control = container.querySelector<HTMLInputElement>(".transit-places-map-layers input");
    expect(control.checked).toBe(true);
    expect(container.textContent).toContain("Neighborhood boundaries could not be loaded");
    expect(container.querySelector(".transit-place-result").textContent).toContain(park.name);
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Retry neighborhoods"]').click());
    expect(onRetry).toHaveBeenCalledTimes(1);
    act(() => container.querySelector<HTMLInputElement>(".transit-places-polygon-toggle input").click());
    expect(onPolygonsShown).toHaveBeenCalledWith(true);
    expect(onShown).not.toHaveBeenCalled();
    act(() => control.click());
    expect(onShown).toHaveBeenCalledWith(false);
    expect(onFilters).not.toHaveBeenCalled();
  });

  it("loads neighborhoods only when enabled and recovers after an independent fetch failure", async () => {
    const originalFetch = global.fetch;
    const fetch = jest.fn().mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue({ ok: true, json: async () => neighborhoodSnapshot });
    global.fetch = fetch;
    function Harness({ enabled }: { enabled: boolean }) {
      const { snapshot, error, retry } = useNeighborhoods(enabled);
      return <button onClick={retry}>{error ? "Failed" : snapshot ? snapshot.features[0].properties.name : "Waiting"}</button>;
    }
    try {
      await act(async () => root.render(<Harness enabled={false} />));
      expect(fetch).not.toHaveBeenCalled();
      await act(async () => root.render(<Harness enabled />));
      expect(container.textContent).toBe("Failed");
      await act(async () => container.querySelector("button").click());
      expect(container.textContent).toBe("Example");
      expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining("/data/places/neighborhoods.json"),
        expect.objectContaining({ cache: "reload" }));
      await act(async () => root.render(<Harness enabled={false} />));
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("keeps neighborhoods beneath POIs, restores after style changes and removes only its own layers", () => {
    const sources = new Set<string>();
    const layers = new Set<string>(["nearby-places-park-points"]);
    const listeners = new Map<string, () => void>();
    const map = {
      getSource: jest.fn(id => sources.has(id)), addSource: jest.fn(id => sources.add(id)),
      getLayer: jest.fn(id => layers.has(id)), addLayer: jest.fn((layer, _before?: string) => layers.add(layer.id)),
      getStyle: () => ({ layers: [...layers].map(id => ({ id })) }),
      setLayoutProperty: jest.fn(), setPaintProperty: jest.fn(),
      on: jest.fn((name, handler) => listeners.set(name, handler)), off: jest.fn(),
      removeLayer: jest.fn(id => layers.delete(id)), removeSource: jest.fn(id => sources.delete(id))
    };
    const onError = jest.fn();
    act(() => root.render(<NearbyNeighborhoodsMap map={map as never} snapshot={neighborhoodSnapshot} polygonsShown={false} onError={onError} />));
    expect(map.addSource).toHaveBeenCalledWith(NEIGHBORHOOD_SOURCE, expect.objectContaining({ data: neighborhoodSnapshot }));
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ type: "symbol",
      layout: expect.objectContaining({ "text-field": ["get", "name"] }) }), "nearby-places-park-points");
    expect(map.addLayer.mock.calls.every(call => call[1] === "nearby-places-park-points")).toBe(true);
    expect(map.setLayoutProperty).toHaveBeenLastCalledWith(NEIGHBORHOOD_LAYERS[0], "visibility", "none");
    act(() => root.render(<NearbyNeighborhoodsMap map={map as never} snapshot={neighborhoodSnapshot} polygonsShown onError={onError} />));
    expect(map.setLayoutProperty).toHaveBeenLastCalledWith(NEIGHBORHOOD_LAYERS[0], "visibility", "visible");
    expect(map.setPaintProperty).toHaveBeenCalledWith(NEIGHBORHOOD_LAYERS[1], "line-width", 2);
    expect(map.setLayoutProperty.mock.calls.every(call => call[0] === NEIGHBORHOOD_LAYERS[0])).toBe(true);
    expect(map.addSource).toHaveBeenCalledTimes(1);
    sources.clear();
    NEIGHBORHOOD_LAYERS.forEach(id => layers.delete(id));
    act(() => listeners.get("style.load")());
    expect(sources.has(NEIGHBORHOOD_SOURCE)).toBe(true);
    expect(map.setLayoutProperty).toHaveBeenLastCalledWith(NEIGHBORHOOD_LAYERS[0], "visibility", "visible");
    expect(onError).not.toHaveBeenCalledWith(true);
    act(() => root.render(null));
    expect(sources.size).toBe(0);
    expect([...layers]).toEqual(["nearby-places-park-points"]);
    expect(map.off).toHaveBeenCalledWith("style.load", expect.any(Function));
  });

  it("filters before clustering, using viewport bounds only for individual sidebar results", () => {
    const filtered = filterPlaces([park, pod], { ...DEFAULT_PLACE_FILTERS, park: false, search: "food" });
    expect(filtered).toEqual([pod]);
    expect(placeFeatures(filtered, "park").features).toHaveLength(0);
    expect(placeFeatures(filtered, "food-cart-pod").features).toHaveLength(1);
    expect(placeInBounds(pod, [-122.675, 45.51, -122.66, 45.525])).toBe(false);
    expect(placeInBounds(park, [-122.675, 45.51, -122.66, 45.525])).toBe(true);
    const params = new URLSearchParams(placePlannerLink(park, [undefined, undefined]).split("?")[1]);
    expect(params.has("fromCoord")).toBe(false);
    expect(params.get("toCoord")).toBe("-122.67,45.52");
    expect(params.get("confirmPlace")).toBe("1");
    expect(placeCategoryForId("metro:library:central-library")).toBe("library");
    expect(placeCategoryForId("metro:community-center:13")).toBe("community-center");
    const library: InterestPlace = { ...park, id: "metro:library:central-library", name: "Central Library", category: "library" };
    const center: InterestPlace = { ...park, id: "metro:community-center:13", name: "Community Center", category: "community-center" };
    expect(filterPlaces([library, center], { ...DEFAULT_PLACE_FILTERS, "community-center": false })).toEqual([library]);
    expect(filterPlaces([library, center], { ...DEFAULT_PLACE_FILTERS, search: "center" })).toEqual([center]);
  });

  it("classifies new destinations, validates schedule metadata and removes only duplicate garden-specific parks", () => {
    for (const place of [garden, market, restroom, tree, ...everydayPlaces]) {
      expect(placeCategoryForId(place.id)).toBe(place.category);
      expect(parsePlaceSnapshot({ ...snapshot, category: place.category, places: [place] }, place.category).places).toEqual([place]);
      expect(placeFeatures([garden, market, restroom, tree, ...everydayPlaces], place.category).features).toHaveLength(1);
      expect(filterPlaces([garden, market, restroom, tree, ...everydayPlaces], { ...DEFAULT_PLACE_FILTERS, [place.category]: false })).not.toContain(place);
    }
    expect(() => parsePlaceSnapshot({ ...snapshot, category: "farmers-market",
      places: [{ ...market, marketHours: 9 }] }, "farmers-market")).toThrow();
    expect(() => parsePlaceSnapshot({ ...snapshot, category: "public-restroom",
      places: [{ ...restroom, restroomStatus: "open-now" }] }, "public-restroom")).toThrow();
    expect(() => parsePlaceSnapshot({ ...snapshot, category: "heritage-tree",
      places: [{ ...tree, scientificName: 1 }] }, "heritage-tree")).toThrow();
    expect(() => parsePlaceSnapshot({ ...snapshot, category: "heritage-tree",
      places: [{ ...tree, restroomAda: "yes" }] }, "heritage-tree")).toThrow();
    expect(filterPlaces([tree, park], { ...DEFAULT_PLACE_FILTERS, search: "Quercus" })).toEqual([tree]);
    const duplicatePark = { ...park, name: "Example Community Garden" };
    expect(filterPlaces([duplicatePark, garden], DEFAULT_PLACE_FILTERS)).toEqual([garden]);
    expect(filterPlaces([duplicatePark, garden], { ...DEFAULT_PLACE_FILTERS, "community-garden": false })).toEqual([]);
    expect(filterPlaces([duplicatePark], DEFAULT_PLACE_FILTERS)).toEqual([duplicatePark]);
    expect(filterPlaces([park, garden], DEFAULT_PLACE_FILTERS)).toEqual([park, garden]);
    expect(filterPlaces([garden, { ...garden, id: `${garden.id.slice(0, -1)}6` }], DEFAULT_PLACE_FILTERS)).toHaveLength(2);
  });

  it("validates category-specific everyday metadata and searches services, materials and pickup products", () => {
    const invalid = [
      { ...everydayPlaces[0], reuseServices: "Not grocery metadata" },
      { ...everydayPlaces[1], reuseItems: 7 }, { ...everydayPlaces[2], pickupSeason: false },
      { ...everydayPlaces[3], bikeSpaces: -1 }, { ...everydayPlaces[3], bikeCovered: "available" }
    ];
    for (const place of invalid) {
      expect(() => parsePlaceSnapshot({ ...snapshot, category: place.category, places: [place] }, place.category)).toThrow();
    }
    expect(filterPlaces(everydayPlaces, { ...DEFAULT_PLACE_FILTERS, search: "tools" })).toEqual([everydayPlaces[1]]);
    expect(filterPlaces(everydayPlaces, { ...DEFAULT_PLACE_FILTERS, search: "lending" })).toEqual([everydayPlaces[1]]);
    expect(filterPlaces(everydayPlaces, { ...DEFAULT_PLACE_FILTERS, search: "vegetables" })).toEqual([everydayPlaces[2]]);
    expect(filterPlaces(everydayPlaces, DEFAULT_PLACE_FILTERS)).not.toContain(everydayPlaces[3]);
    expect(filterPlaces(everydayPlaces, { ...DEFAULT_PLACE_FILTERS, "bicycle-parking": true })).toContain(everydayPlaces[3]);
  });
  it("validates and searches amenity classifications without treating tables as fountains or flooding the default map", () => {
    for (const place of amenities) {
      expect(parsePlaceSnapshot({ ...snapshot, category: place.category, places: [place] }, place.category).places).toEqual([place]);
      expect(placeCategoryForId(place.id)).toBe(place.category);
    }
    expect(() => parsePlaceSnapshot({ ...snapshot, category: "drinking-fountain",
      places: [{ ...amenities[0], amenityType: "Bench" }] }, "drinking-fountain")).toThrow();
    expect(() => parsePlaceSnapshot({ ...snapshot, places: [{ ...park, amenityStyle: "Unsupported" }] }, "park")).toThrow();
    expect(filterPlaces(amenities, DEFAULT_PLACE_FILTERS)).not.toContain(amenities[1]);
    expect(filterPlaces(amenities, { ...DEFAULT_PLACE_FILTERS, search: "dog bowl" })).toEqual([amenities[0]]);
    expect(filterPlaces(amenities, { ...DEFAULT_PLACE_FILTERS, "picnic-seating": true, search: "bench" })).toEqual([amenities[1]]);
  });

  it.each([
    require("../../public/data/places/grocery-stores.json"),
    require("../../public/data/places/reuse-repair.json"),
    require("../../public/data/places/csa-pickups.json"),
    require("../../public/data/places/bicycle-parking.json"),
    require("../../public/data/places/drinking-fountain.json"),
    require("../../public/data/places/picnic-seating.json"),
    require("../../public/data/places/park-artwork.json"),
    require("../../public/data/places/museums.json"),
    require("../../public/data/places/art-galleries.json"),
    require("../../public/data/places/theatres.json"),
    require("../../public/data/places/arts-centres.json"),
    require("../../public/data/places/viewpoints.json"),
    require("../../public/data/places/playgrounds.json"),
    require("../../public/data/places/splash-pads.json"),
    require("../../public/data/places/historic-sites.json"),
    require("../../public/data/places/public-art.json"),
    require("../../public/data/places/sports-courts.json"),
    require("../../public/data/places/skateparks.json"),
    require("../../public/data/places/public-gardens.json"),
    require("../../public/data/places/nature-reserves.json"),
    require("../../public/data/places/cafes.json"),
    require("../../public/data/places/bakeries.json")
  ])("accepts every published $category record in the actual catalog parser", data => {
    expect(parsePlaceSnapshot(data, data.category).places).toHaveLength(data.places.length);
  });

  it.each([garden, market, restroom, tree, ...everydayPlaces, ...amenities, ...culturalPlaces, ...outingPlaces])("shows $category details, caveats, and an approximate named planner destination", place => {
    act(() => root.render(<MemoryRouter><NearbyPlaces sources={emptyPlaceSources()}
      filters={DEFAULT_PLACE_FILTERS} onFilters={jest.fn()} visiblePlaces={[place]} selected={place}
      onSelect={jest.fn()} onRetry={jest.fn()} mapReady mapError={false} /></MemoryRouter>));
    expect(container.querySelector("#selected-place-heading").textContent).toBe(place.name);
    const params = new URLSearchParams(container.querySelector<HTMLAnchorElement>('a[href*="toPlaceId"]').search);
    expect(params.get("toPlaceId")).toBe(place.id);
    expect(params.get("confirmPlace")).toBe("1");
    if (place.category === "farmers-market") {
      expect(container.textContent).toContain("Source-listed schedule");
      expect(container.textContent).toContain("not live opening information");
      expect(container.textContent).toContain("Saturday");
      expect(container.textContent).toContain("May - October");
    } else if (place.category === "community-garden") {
      expect(container.textContent).toContain("restricted access");
    } else if (place.category === "public-restroom") {
      expect(container.textContent).toContain("Listed 24/7 in the source; not verified");
      expect(container.textContent).toContain("ADA designation: Unknown");
      expect(container.textContent).toContain("Not live availability or a verified accessible route");
    } else if (place.category === "heritage-tree") {
      expect(container.textContent).toContain("Quercus garryana");
      expect(container.textContent).toContain("Private, Front Yard");
      expect(container.textContent).toContain("do not enter private property");
    } else if (place.category === "grocery-store") {
      expect(container.textContent).toContain("not live opening or stock information");
    } else if (place.category === "reuse-repair") {
      expect(container.textContent).toContain("Lending Library");
      expect(container.textContent).toContain("Items: Tools");
      expect(container.textContent).toContain("accepted items");
    } else if (place.category === "csa-pickup") {
      expect(container.textContent).toContain("June - November");
      expect(container.textContent).toContain("vegetables");
      expect(container.textContent).toContain("not a public market or a live schedule");
      expect(container.textContent).toContain("do not enter private property");
    } else if (place.category === "bicycle-parking") {
      expect(container.textContent).toContain("Capacity: 2 spaces");
      expect(container.textContent).toContain("Covered: Yes");
      expect(container.textContent).toContain("racks, not spaces");
      expect(container.textContent).toContain("does not reserve parking or select a cycling route");
    } else if (place.category === "drinking-fountain") {
      expect(container.textContent).toContain("potability");
      expect(container.textContent).toContain("Dog Bowl");
    } else if (place.category === "picnic-seating") {
      expect(container.textContent).toContain("not a reservable picnic area");
    } else if (place.category === "park-artwork") {
      expect(container.textContent).toContain("not a complete public-art directory");
    } else if (CULTURE_PLACE_CATEGORIES.includes(place.category)) {
      expect(container.textContent).toContain("not live opening information");
      expect(container.textContent).toContain("Admission, tickets, reservations, accessibility and public access are not verified");
    } else if (OUTING_PLACE_CATEGORIES.includes(place.category)) {
      expect(container.textContent).toContain("not live opening or availability information");
      expect(container.textContent).toContain(place.siteType);
      if (place.category === "splash-pad") expect(container.textContent).toContain("not a drinking-water source");
    }
  });

  it("exposes accessible individual results and route context even when one source failed", () => {
    const select = jest.fn();
    const retry = jest.fn();
    let clearSelection: () => void;
    function Harness() {
      const [selected, setSelected] = React.useState<InterestPlace>();
      clearSelection = () => setSelected(undefined);
      return <MemoryRouter><NearbyPlaces sources={{
      ...emptyPlaceSources(),
      park: { snapshot, loading: false, error: false },
      "food-cart-pod": { loading: false, error: true }
    }} filters={DEFAULT_PLACE_FILTERS} onFilters={jest.fn()}
      visiblePlaces={[park]} selected={selected} onSelect={(id, pan) => {
        select(id, pan);
        setSelected(id === park.id ? park : undefined);
      }} onRetry={retry} mapError={false} mapReady
    /></MemoryRouter>;
    }
    act(() => root.render(<Harness />));
    expect(container.textContent).toContain("Food-cart pods could not be loaded");
    expect(container.querySelectorAll('.transit-places-group-children input[type="checkbox"]')).toHaveLength(PLACE_CATEGORIES.length);
    const result = container.querySelector<HTMLAnchorElement>(".transit-place-result");
    expect(result.getAttribute("href")).toBe(placeDetailLink(park.id));
    act(() => result.click());
    expect(select).toHaveBeenCalledWith(park.id, true);
    const link = container.querySelector<HTMLAnchorElement>('a[href*="toPlaceId"]');
    expect(link.search).toContain("toPlaceId=portland%3Apark%3A1");
    expect(container.textContent).toContain("not a verified public entrance");
    act(() => clearSelection());
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Retry food-cart pods"]').click());
    expect(retry).toHaveBeenCalledWith("food-cart-pod");
    expect(container.querySelector(".transit-places-list")).not.toBeNull();
    expect(container.textContent).not.toContain("Back to places");
    act(() => clearSelection());
    expect(container.querySelector(".transit-places-list")).not.toBeNull();
    expect(document.activeElement).toBe(container.querySelector(".transit-place-result"));
  });

  it("expands clusters, offers coincident locations, restores style layers and cleans up listeners", async () => {
    const sources = new Map<string, { setData: jest.Mock; getClusterExpansionZoom: jest.Mock; getClusterLeaves: jest.Mock }>();
    const layers = new Set<string>();
    const images = new Set<string>();
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const source = { setData: jest.fn(), getClusterExpansionZoom: jest.fn((_id, callback) => callback(null, 15)),
      getClusterLeaves: jest.fn((_id, _limit, _offset, callback) => callback(null, [{ properties: { id: park.id } }, { properties: { id: pod.id } }])) };
    const canvas = document.createElement("canvas");
    const fakeMap = {
      getSource: jest.fn(id => sources.get(id)),
      addSource: jest.fn(id => sources.set(id, source)),
      getLayer: jest.fn(id => layers.has(id)),
      addLayer: jest.fn(layer => layers.add(layer.id)),
      setFilter: jest.fn(),
      setLayoutProperty: jest.fn(),
      hasImage: jest.fn(id => images.has(id)),
      addImage: jest.fn(id => images.add(id)),
      removeImage: jest.fn(id => images.delete(id)),
      getBounds: () => ({ getWest: () => -122.8, getEast: () => -122.5, getSouth: () => 45.4, getNorth: () => 45.7 }),
      getCanvas: () => canvas,
      on: jest.fn((name, handler) => listeners.set(name, handler)),
      off: jest.fn(),
      removeLayer: jest.fn(id => layers.delete(id)),
      removeSource: jest.fn(id => sources.delete(id)),
      getZoom: jest.fn(() => 12), getMaxZoom: () => 22, easeTo: jest.fn(),
      queryRenderedFeatures: jest.fn()
    };
    const onCoincident = jest.fn();
    const onSelect = jest.fn();
    const onError = jest.fn();
    const hoverPlace = { ...park, name: "Example <img> Park", address: "100 <b>Main</b> Street" };
    act(() => root.render(<NearbyPlacesMap map={fakeMap as never} places={[hoverPlace, pod]} selectedId={park.id}
      onSelect={onSelect} onCoincident={onCoincident} onBounds={jest.fn()} onError={onError} />));
    expect(fakeMap.addSource).toHaveBeenCalledWith("nearby-places-park", expect.objectContaining({ cluster: true }));
    expect(images.size).toBe(PLACE_CATEGORIES.length);
    expect(fakeMap.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: "nearby-places-park-counts",
      layout: expect.objectContaining({ "icon-image": "nearby-places-park-icon", "text-field": ["get", "point_count_abbreviated"] })
    }));
    expect(fakeMap.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: "nearby-places-food-cart-pod-icons",
      layout: expect.objectContaining({ "icon-image": "nearby-places-food-cart-pod-icon" })
    }));
    for (const category of PLACE_CATEGORIES) {
      expect(fakeMap.addLayer).toHaveBeenCalledWith(expect.objectContaining({
        id: `nearby-places-${category}-counts`,
        layout: expect.objectContaining({ "icon-image": `nearby-places-${category}-icon` })
      }));
      if (OSM_PLACE_CATEGORIES.includes(category)) {
        expect(fakeMap.addSource).toHaveBeenCalledWith(`nearby-places-${category}`,
          expect.objectContaining({ attribution: expect.stringContaining("OpenStreetMap contributors (ODbL)") }));
      }
    }
    const popup = jest.mocked(Popup).mock.results.slice(-1)[0].value;
    fakeMap.queryRenderedFeatures.mockReturnValue([{ source: "nearby-places-park",
      geometry: { type: "Point", coordinates: park.coordinates }, properties: { id: park.id } }]);
    act(() => listeners.get("mousemove")({ point: { x: 1, y: 1 }, lngLat: { lng: -122.67 } }));
    const content = popup.setDOMContent.mock.calls.slice(-1)[0][0];
    expect(content.textContent).toContain(hoverPlace.name);
    expect(content.textContent).toContain(hoverPlace.address);
    expect(content.querySelector("img, b")).toBeNull();
    expect(popup.addTo).toHaveBeenCalledWith(fakeMap);
    const removedBeforeLeave = popup.remove.mock.calls.length;
    act(() => canvas.dispatchEvent(new MouseEvent("mouseleave")));
    expect(popup.remove).toHaveBeenCalledTimes(removedBeforeLeave + 1);
    expect(canvas.style.cursor).toBe("");
    await act(async () => listeners.get("click")({ point: { x: 1, y: 1 } }));
    expect(onSelect).toHaveBeenCalledWith(park.id);
    fakeMap.queryRenderedFeatures.mockReturnValue([
      { source: "nearby-places-park", geometry: { type: "Point", coordinates: park.coordinates }, properties: { id: park.id } },
      { source: "nearby-places-food-cart-pod", geometry: { type: "Point", coordinates: pod.coordinates },
        properties: { cluster: true, cluster_id: 2, point_count: 3 } }
    ]);
    act(() => listeners.get("mousemove")({ point: { x: 1, y: 1 }, lngLat: { lng: -122.67 } }));
    expect(popup.setDOMContent.mock.calls.slice(-1)[0][0].textContent).toContain(hoverPlace.name);
    await act(async () => listeners.get("click")({ point: { x: 1, y: 1 } }));
    expect(onSelect).toHaveBeenLastCalledWith(park.id);
    expect(fakeMap.easeTo).not.toHaveBeenCalled();
    fakeMap.queryRenderedFeatures.mockReturnValue([{ source: "nearby-places-park", geometry: { type: "Point", coordinates: park.coordinates },
      properties: { cluster: true, cluster_id: 1, point_count: 2 } }]);
    act(() => listeners.get("mousemove")({ point: { x: 1, y: 1 }, lngLat: { lng: -122.67 } }));
    expect(popup.setDOMContent.mock.calls.slice(-1)[0][0].textContent).toContain("2 parks");
    await act(async () => listeners.get("click")({ point: { x: 1, y: 1 } }));
    expect(fakeMap.easeTo).toHaveBeenCalledWith({ center: park.coordinates, zoom: 15 });
    fakeMap.getZoom.mockReturnValue(22);
    await act(async () => listeners.get("click")({ point: { x: 1, y: 1 } }));
    expect(onCoincident).toHaveBeenCalledWith([park.id, pod.id]);
    fakeMap.queryRenderedFeatures.mockReturnValue([{ properties: { id: park.id } }, { properties: { id: pod.id } }]);
    await act(async () => listeners.get("click")({ point: { x: 1, y: 1 } }));
    expect(onCoincident).toHaveBeenCalledWith([park.id, pod.id]);
    act(() => root.render(<NearbyPlacesMap map={fakeMap as never} places={[hoverPlace]} selectedId={park.id}
      onSelect={onSelect} onCoincident={onCoincident} onBounds={jest.fn()} onError={onError} />));
    for (const suffix of ["clusters", "counts", "points", "icons", "selection"]) {
      expect(fakeMap.setLayoutProperty).toHaveBeenCalledWith(`nearby-places-food-cart-pod-${suffix}`, "visibility", "none");
    }
    expect(fakeMap.setLayoutProperty).toHaveBeenCalledWith("nearby-places-park-points", "visibility", "visible");
    fakeMap.setLayoutProperty.mockClear();
    act(() => root.render(<NearbyPlacesMap map={fakeMap as never} places={[hoverPlace, pod]} selectedId={park.id}
      onSelect={onSelect} onCoincident={onCoincident} onBounds={jest.fn()} onError={onError} />));
    for (const suffix of ["clusters", "counts", "points", "icons", "selection"]) {
      expect(fakeMap.setLayoutProperty).toHaveBeenCalledWith(`nearby-places-food-cart-pod-${suffix}`, "visibility", "visible");
    }
    sources.clear(); layers.clear(); images.clear();
    act(() => listeners.get("style.load")());
    expect(sources.size).toBe(PLACE_CATEGORIES.length);
    expect(onError).not.toHaveBeenCalledWith(true);
    act(() => root.render(null));
    expect(sources.size).toBe(0);
    expect(layers.size).toBe(0);
    expect(images.size).toBe(0);
    expect(fakeMap.off).toHaveBeenCalledTimes(5);
  });
});
