import { vi, type MockInstance } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import * as places from "@overworld/places/catalog";
import GlobalPlacesSearch from "../view/mainNav/components/GlobalPlacesSearch";
import { placeIconDefinition } from "../view/nearby/util/mapbox/placeIcons";
import * as deviceGeolocation from "../api/geolocation/geoLocateCurrentPosition";

const cafe: places.InterestPlace = { id: "osm:cafe:node:1", category: "cafe", name: "Café Yarrow",
  coordinates: [-122.7, 45.6], address: "20 Northeast Broadway", siteType: "Cafe",
  arrival: "approximate", sourceUrl: "https://www.openstreetmap.org/node/1" };
const bike: places.InterestPlace = { ...cafe, id: "portland:bike:rack-2", category: "bicycle-parking",
  name: "Broadway rack", siteType: undefined };
const park: places.InterestPlace = { ...cafe, id: "portland:park:3", category: "park", name: "Yarrow Park", siteType: undefined };
const reserve: places.InterestPlace = { ...park, id: "osm:nature-reserve:way:4", category: "nature-reserve" };

function loadedSources(records: places.InterestPlace[]) {
  const sources = places.emptyPlaceSources();
  places.PLACE_CATEGORIES.forEach(category => {
    sources[category] = { loading: false, error: false, snapshot: {
      version: 1, category, retrievedAt: "2026-11-19T12:00:00Z", source: "Test source",
      sourceUrl: cafe.sourceUrl, license: "ODbL-1.0", licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
      coverage: "Test", places: records.filter(place => place.category === category)
    } };
  });
  return sources;
}

function LocationProbe() {
  const location = useLocation();
  return <output data-location>{location.pathname}{location.search}</output>;
}

describe("Global navbar Places search", () => {
  let container: HTMLDivElement, root: Root;
  let catalog: ReturnType<typeof places.usePlaceCatalog>;
  let loadCatalog: MockInstance<typeof places.usePlaceCatalog>;
  let sharedLocationHook: MockInstance<typeof deviceGeolocation.useSharedDeviceLocation>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    catalog = { places: [park, reserve, cafe, bike], sources: loadedSources([park, reserve, cafe, bike]), retry: vi.fn() };
    loadCatalog = vi.spyOn(places, "usePlaceCatalog").mockImplementation(() => catalog);
    sharedLocationHook = vi.spyOn(deviceGeolocation, "useSharedDeviceLocation").mockReturnValue(undefined);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });
  function render() {
    act(() => root.render(<MemoryRouter basename="/preview" initialEntries={["/preview/nearby/places?view=kept"]}>
      <GlobalPlacesSearch /><LocationProbe />
    </MemoryRouter>));
  }
  const input = () => container.querySelector<HTMLInputElement>('input[type="search"]');
  function search(query: string) {
    act(() => input().focus());
    act(() => fireEvent.change(input(), { target: { value: query } }));
  }
  const results = () => [...container.querySelectorAll<HTMLAnchorElement>("a[data-global-place]")];

  it("searches all records, category labels and source types without applying defaults, deduplication or map bounds", () => {
    expect(places.filterPlaces([cafe, bike], places.DEFAULT_PLACE_FILTERS)).toEqual([]);
    expect(places.searchPlaces([park, reserve, cafe, bike], "Yarrow")).toHaveLength(3);
    expect(places.searchPlaces([cafe], "cafe broadway")).toEqual([cafe]);
    expect(places.searchPlaces([bike], "bicycle parking")).toEqual([bike]);
    expect(places.searchPlaces([{ ...park, siteType: undefined }, { ...cafe, siteType: "espresso bar" }], "espresso")).toEqual([{ ...cafe, siteType: "espresso bar" }]);
    expect(places.searchPlaces([cafe, bike], "   ")).toEqual([]);
    const exact = { ...cafe, id: "osm:cafe:node:9", name: "Yarrow" };
    const starts = { ...park, name: "Yarrow Gardens" };
    expect(places.searchPlaces([cafe, starts, exact], "yarrow")).toEqual([exact, starts, cafe]);
  });

  it("prefers nearby equally relevant matches without overriding name relevance or excluding distant results", () => {
    const origin: [number, number] = [-122.67, 45.55];
    const near: places.InterestPlace = { ...cafe, name: "Zinnia Cafe", coordinates: [-122.66, 45.55] };
    const far: places.InterestPlace = { ...cafe, id: "osm:cafe:node:2", name: "Alder Cafe", coordinates: [-122.67, 45.559] };
    const exact: places.InterestPlace = { ...cafe, id: "osm:cafe:node:3", name: "Café", coordinates: [-123, 46] };
    const prefix: places.InterestPlace = { ...exact, id: "osm:cafe:node:4", name: "Cafe Horizon" };
    const records = [near, far, prefix, exact];
    expect(places.searchPlaces(records, "cafe")).toEqual([exact, prefix, far, near]);
    expect(places.searchPlaces(records, "cafe", origin)).toEqual([exact, prefix, near, far]);
    expect(places.searchPlaces(records, "cafe", far.coordinates)).toEqual([exact, prefix, far, near]);
    expect(records).toEqual([near, far, prefix, exact]);
  });

  it("loads lazily and returns disabled categories with basename-aware direct links without changing the current view", () => {
    render();
    expect(loadCatalog).toHaveBeenLastCalledWith(false);
    expect(container.querySelector(".transit-global-search-popover")).toBeNull();
    search("cafe");
    expect(loadCatalog).toHaveBeenLastCalledWith(true);
    expect(results().map(link => link.textContent)).toEqual([expect.stringContaining("Café Yarrow")]);
    expect(results()[0].getAttribute("href")).toBe("/preview/nearby/places/osm%3Acafe%3Anode%3A1");
    expect(container.querySelector("[data-location]").textContent).toBe("/nearby/places?view=kept");
    expect(container.textContent).toContain("Map filters stay unchanged");
    act(() => results()[0].click());
    expect(container.querySelector("[data-location]").textContent).toBe("/nearby/places/osm%3Acafe%3Anode%3A1");
    expect(container.querySelector(".transit-global-search-popover")).toBeNull();
  });

  it("reacts to previously shared device positions without requesting location from search and clears preference on denial", async () => {
    sharedLocationHook.mockRestore();
    const original = Object.getOwnPropertyDescriptor(navigator, "geolocation");
    const near: places.InterestPlace = { ...cafe, name: "Zinnia Cafe", coordinates: [-122.66, 45.55] };
    const far: places.InterestPlace = { ...cafe, id: "osm:cafe:node:2", name: "Alder Cafe", coordinates: [-122.67, 45.559] };
    catalog = { ...catalog, places: [far, near], sources: loadedSources([far, near]) };
    const getCurrentPosition = vi.fn((success, _failure) => success({ coords: { longitude: -122.67, latitude: 45.55 } }));
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
    const names = () => results().map(link => link.querySelector("strong").textContent);
    try {
      render();
      search("cafe");
      expect(names()).toEqual([far.name, near.name]);
      expect(container.querySelector(".transit-global-search-distance")).toBeNull();
      expect(getCurrentPosition).not.toHaveBeenCalled();
      await act(async () => { await deviceGeolocation.default(); });
      expect(names()).toEqual([near.name, far.name]);
      expect(container.querySelectorAll(".transit-global-search-distance")).toHaveLength(2);
      expect(input().value).toBe("cafe");
      getCurrentPosition.mockImplementationOnce(success => success({ coords: {
        longitude: far.coordinates[0], latitude: far.coordinates[1]
      } }));
      await act(async () => { await deviceGeolocation.default(); });
      expect(names()).toEqual([far.name, near.name]);
      expect(results()[0].querySelector(".transit-global-search-distance > span").textContent).toBe("0 ft");
      await act(async () => { await deviceGeolocation.default(); });
      expect(names()).toEqual([near.name, far.name]);
      const denied = { code: 1, message: "Permission denied" };
      getCurrentPosition.mockImplementationOnce((_success, failure) => failure(denied));
      await act(async () => { await expect(deviceGeolocation.default()).rejects.toBe(denied); });
      expect(names()).toEqual([far.name, near.name]);
      expect(container.querySelector(".transit-global-search-distance")).toBeNull();
      expect(getCurrentPosition).toHaveBeenCalledTimes(4);
    } finally {
      if (original) Object.defineProperty(navigator, "geolocation", original);
      else delete navigator.geolocation;
    }
  });

  it.each<[[number, number], string]>([
    [[0, 0], "0 ft"],
    [[0.001, 0], "365 ft"],
    [[0.015, 0], "1.0 mi"],
    [[0.1, 0], "6.9 mi"],
  ])("shows compact straight-line distance to %s from the shared position", (coordinates, expected) => {
    sharedLocationHook.mockReturnValue([0, 0]);
    const place = { ...cafe, coordinates };
    catalog = { ...catalog, places: [place], sources: loadedSources([place]) };
    render();
    search("cafe");
    const label = results()[0].querySelector(".transit-global-search-distance");
    expect(label.querySelector("span").textContent).toBe(expected);
    expect(label.textContent).toContain("straight-line from your shared location");
    expect(results()[0].querySelector("strong").textContent).toBe(cafe.name);
  });

  it("supports keyboard results, Escape, focus dismissal and pointer dismissal without discarding the query", () => {
    render();
    search("yarrow");
    act(() => input().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    expect(document.activeElement).toBe(results()[0]);
    act(() => results()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    expect(document.activeElement).toBe(results()[1]);
    act(() => results()[1].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true })));
    expect(document.activeElement).toBe(results()[0]);
    act(() => results()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(container.querySelector(".transit-global-search-popover")).toBeNull();
    expect(document.activeElement).toBe(input());
    expect(input().value).toBe("yarrow");
    act(() => input().click());
    expect(results()).toHaveLength(3);
    act(() => document.body.dispatchEvent(new Event("pointerdown", { bubbles: true })));
    expect(results()).toHaveLength(0);
    act(() => input().blur());
    act(() => input().focus());
    act(() => input().blur());
    expect(results()).toHaveLength(0);
  });

  it("uses the same decorative category icons and color hooks as Places results", () => {
    render();
    search("Broadway");
    expect(results()).toHaveLength(catalog.places.length);
    for (const place of catalog.places) {
      const link = results().find(result => result.dataset.globalPlace === place.id);
      const icon = link.querySelector("svg.transit-place-icon");
      expect(icon.getAttribute("data-icon")).toBe(placeIconDefinition(place.category).iconName);
      expect(icon.classList.contains(`transit-place-icon--${place.category}`)).toBe(true);
      expect(icon.getAttribute("aria-hidden")).toBe("true");
      expect(link.querySelector("strong").textContent).toBe(place.name);
    }
  });

  it("highlights each search term in names, category labels and addresses without changing the displayed text", () => {
    render();
    search("cafe broadway");
    const link = results()[0];
    expect(link.querySelector("strong mark").textContent).toBe("Café");
    expect([...link.querySelectorAll("small mark")].map(mark => mark.textContent)).toEqual(["Café", "Broadway"]);
    expect(link.querySelector("strong").textContent).toBe(cafe.name);
    expect(link.querySelector("small").textContent).toBe("Cafés / 20 Northeast Broadway");
  });

  it.each<[string, string, string[]]>([
    ["🌿 Cafe\u0301 / CAFÉ", "cafe", ["Cafe\u0301", "CAFÉ"]],
    ["A [x] <img src=x>", "[x] <img", ["[x]", "<img"]],
    ["Banana", "ana", ["anana"]],
  ])("highlights literal repeated/overlapping matches while preserving %s", (name, query, expected) => {
    const place = { ...cafe, name };
    catalog = { ...catalog, places: [place], sources: loadedSources([place]) };
    render();
    search(query);
    const label = results()[0].querySelector("strong");
    expect(label.textContent).toBe(name);
    expect([...label.querySelectorAll("mark")].map(mark => mark.textContent)).toEqual(expected);
    expect(label.querySelector("img")).toBeNull();
  });

  it("explains incomplete results beside the heading and retries only unavailable sources", () => {
    catalog.sources.playground = { loading: false, error: true };
    catalog.sources.museum = { loading: true, error: false };
    render();
    search("cafe");
    expect(results()).toHaveLength(1);
    expect(container.textContent).toContain("found so far");
    const error = container.querySelector<HTMLButtonElement>('button[aria-label="All places error"]');
    expect(error.closest(".transit-global-search-heading")).not.toBeNull();
    act(() => error.focus());
    expect(document.querySelector('[role="tooltip"]').textContent).toBe("Playgrounds could not be loaded. Other available places remain usable.");
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Retry all places"]').click());
    expect(catalog.retry).toHaveBeenCalledTimes(1);
    expect(catalog.retry).toHaveBeenCalledWith("playground");
    act(() => error.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(container.querySelector(".transit-global-search-popover")).toBeNull();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it("shows loading/empty states and exposes every result through explicit pagination", () => {
    const many = Array.from({ length: 23 }, (_, i) => ({ ...park, id: `portland:park:${i + 1}`, name: `Garden ${i + 1}` }));
    catalog = { ...catalog, places: many, sources: loadedSources(many) };
    render();
    search("Garden");
    expect(results()).toHaveLength(10);
    expect(container.textContent).toContain("Showing 10 of 23 places");
    act(() => container.querySelector<HTMLButtonElement>(".transit-global-search-more").click());
    expect(results()).toHaveLength(20);
    act(() => container.querySelector<HTMLButtonElement>(".transit-global-search-more").click());
    expect(results()).toHaveLength(23);
    expect(container.querySelector(".transit-global-search-more")).toBeNull();
    search("no such venue");
    expect(container.textContent).toContain("No places match");
    catalog = { ...catalog, sources: { ...catalog.sources, park: { loading: true, error: false } } };
    render();
    expect(container.textContent).toContain("Loading the place catalog");
    catalog = { ...catalog, sources: { ...catalog.sources, park: { loading: false, error: true } } };
    render();
    expect(container.textContent).toContain("No matching places in the loaded categories");
  });
});
