import { vi } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { CULTURE_PLACE_CATEGORIES, OUTING_PLACE_CATEGORIES, DEFAULT_PLACE_FILTERS, emptyPlaceSources, filterPlaces, InterestPlace, parsePlaceSnapshot, placeCategoryForId, PLACE_CATEGORIES, PlaceSnapshot, usePlaceCatalog } from "@overworld/places/catalog";
import { Popup } from "mapbox-gl";
import NearbyPlaces from "../view/nearby/components/NearbyPlaces";
import PlacesHelp from "../view/nearby/components/PlacesHelp";
import { NeighborhoodSnapshot } from "@overworld/places/neighborhoods";
import { DEFAULT_LINE_OVERLAYS, LineOverlayCategory, LineOverlaySnapshot } from "@overworld/places/lineOverlays";
vi.mock("../view/nearby/util/mapbox/placeIcons", async () => ({
  ...(await vi.importActual<typeof import("../view/nearby/util/mapbox/placeIcons")>("../view/nearby/util/mapbox/placeIcons")),
  createPlaceIconImage: vi.fn(() => ({ width: 48, height: 48, data: new Uint8Array(48 * 48 * 4) }))
}));
vi.mock("mapbox-gl", () => ({ Popup: vi.fn() }));

const park: InterestPlace = {
  id: "portland:park:1", name: "Example Park", category: "park", coordinates: [-122.67, 45.52],
  arrival: "approximate", sourceUrl: "https://www.portlandmaps.com/"
};
const pod: InterestPlace = {
  id: "osm:way:2", name: "Example Food Carts", category: "food-cart-pod", coordinates: [-122.68, 45.53],
  arrival: "approximate", sourceUrl: "https://www.openstreetmap.org/way/2"
};
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

describe("Places controls, categories and source recovery", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.mocked(Popup).mockImplementation(function () { return {
      setLngLat: vi.fn().mockReturnThis(), setDOMContent: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(), remove: vi.fn()
    } as never; });
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
    const measure = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
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
          onSelect={vi.fn()} onRetry={vi.fn()} mapReady mapError={false}
          discovery={<button>Discovery action</button>}
          neighborhoods={{ shown: true, onShown: vi.fn(), polygonsShown: false, onPolygonsShown: vi.fn(),
            loading: false, error: true, mapError: false, onRetry: vi.fn() }} />
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
    const fetch = vi.fn().mockRejectedValue(new Error("Unavailable source"));
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
    const retry = vi.fn(), onFilters = vi.fn();
    const sources = { ...emptyPlaceSources(), cafe: { loading: false, error: true } };
    await act(async () => root.render(<MemoryRouter><NearbyPlaces sources={sources} filters={DEFAULT_PLACE_FILTERS}
      onFilters={onFilters} visiblePlaces={[]} onSelect={vi.fn()} onRetry={retry} mapReady mapError={false} /></MemoryRouter>));
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
    const retry = vi.fn(), retryMap = vi.fn();
    const sources = {
      "park-trails": { loading: false, error: true, snapshot: overlaySnapshot("park-trails"), retry: vi.fn() },
      "bicycle-network": { loading: false, error: false, retry: vi.fn() },
      "recommended-bike-routes": { loading: false, error: false, retry: vi.fn() }
    };
    await act(async () => root.render(<MemoryRouter><NearbyPlaces sources={emptyPlaceSources()} filters={DEFAULT_PLACE_FILTERS}
      onFilters={vi.fn()} visiblePlaces={[]} onSelect={vi.fn()} onRetry={vi.fn()} mapReady mapError onRetryMap={retryMap}
      neighborhoods={{ shown: false, onShown: vi.fn(), polygonsShown: false, onPolygonsShown: vi.fn(),
        loading: false, error: false, mapError: false, onRetry: vi.fn() }}
      lineOverlays={{ shown: { ...DEFAULT_LINE_OVERLAYS, "park-trails": true }, sources,
        mapErrors: DEFAULT_LINE_OVERLAYS, onShown: vi.fn(), onRetry: retry }} /></MemoryRouter>));
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
        visiblePlaces={[]} onSelect={vi.fn()} onRetry={vi.fn()} mapReady mapError={false} /></MemoryRouter>;
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
});
