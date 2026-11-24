import { vi, type Mock } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { CULTURE_PLACE_CATEGORIES, OUTING_PLACE_CATEGORIES, OSM_PLACE_CATEGORIES, DEFAULT_PLACE_FILTERS, emptyPlaceSources, filterPlaces, InterestPlace, parsePlaceSnapshot, placeCategoryForId, PLACE_CATEGORIES, placeDetailLink, placeInBounds, placePlannerLink, PlaceSnapshot } from "@overworld/places/catalog";
import { Popup } from "mapbox-gl";
import NearbyPlaces from "../view/nearby/components/NearbyPlaces";
import NearbyPlacesMap, { placeFeatures } from "../view/nearby/components/NearbyPlacesMap";
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
describe("Places metadata, results, details and clustered markers", () => {
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
    require("../../../../../public/data/places/grocery-stores.json"),
    require("../../../../../public/data/places/reuse-repair.json"),
    require("../../../../../public/data/places/csa-pickups.json"),
    require("../../../../../public/data/places/bicycle-parking.json"),
    require("../../../../../public/data/places/drinking-fountain.json"),
    require("../../../../../public/data/places/picnic-seating.json"),
    require("../../../../../public/data/places/park-artwork.json"),
    require("../../../../../public/data/places/museums.json"),
    require("../../../../../public/data/places/art-galleries.json"),
    require("../../../../../public/data/places/theatres.json"),
    require("../../../../../public/data/places/arts-centres.json"),
    require("../../../../../public/data/places/viewpoints.json"),
    require("../../../../../public/data/places/playgrounds.json"),
    require("../../../../../public/data/places/splash-pads.json"),
    require("../../../../../public/data/places/historic-sites.json"),
    require("../../../../../public/data/places/public-art.json"),
    require("../../../../../public/data/places/sports-courts.json"),
    require("../../../../../public/data/places/skateparks.json"),
    require("../../../../../public/data/places/public-gardens.json"),
    require("../../../../../public/data/places/nature-reserves.json"),
    require("../../../../../public/data/places/cafes.json"),
    require("../../../../../public/data/places/bakeries.json")
  ])("accepts every published $category record in the actual catalog parser", data => {
    expect(parsePlaceSnapshot(data, data.category).places).toHaveLength(data.places.length);
  });

  it.each([garden, market, restroom, tree, ...everydayPlaces, ...amenities, ...culturalPlaces, ...outingPlaces])("shows $category details, caveats, and an approximate named planner destination", place => {
    act(() => root.render(<MemoryRouter><NearbyPlaces sources={emptyPlaceSources()}
      filters={DEFAULT_PLACE_FILTERS} onFilters={vi.fn()} visiblePlaces={[place]} selected={place}
      onSelect={vi.fn()} onRetry={vi.fn()} mapReady mapError={false} /></MemoryRouter>));
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
    const select = vi.fn();
    const retry = vi.fn();
    let clearSelection: () => void;
    function Harness() {
      const [selected, setSelected] = React.useState<InterestPlace>();
      clearSelection = () => setSelected(undefined);
      return <MemoryRouter><NearbyPlaces sources={{
      ...emptyPlaceSources(),
      park: { snapshot, loading: false, error: false },
      "food-cart-pod": { loading: false, error: true }
    }} filters={DEFAULT_PLACE_FILTERS} onFilters={vi.fn()}
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
    const sources = new Map<string, { setData: Mock; getClusterExpansionZoom: Mock; getClusterLeaves: Mock }>();
    const layers = new Set<string>();
    const images = new Set<string>();
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const source = { setData: vi.fn(), getClusterExpansionZoom: vi.fn((_id, callback) => callback(null, 15)),
      getClusterLeaves: vi.fn((_id, _limit, _offset, callback) => callback(null, [{ properties: { id: park.id } }, { properties: { id: pod.id } }])) };
    const canvas = document.createElement("canvas");
    const fakeMap = {
      getSource: vi.fn(id => sources.get(id)),
      addSource: vi.fn(id => sources.set(id, source)),
      getLayer: vi.fn(id => layers.has(id)),
      addLayer: vi.fn(layer => layers.add(layer.id)),
      setFilter: vi.fn(),
      setLayoutProperty: vi.fn(),
      hasImage: vi.fn(id => images.has(id)),
      addImage: vi.fn(id => images.add(id)),
      removeImage: vi.fn(id => images.delete(id)),
      getBounds: () => ({ getWest: () => -122.8, getEast: () => -122.5, getSouth: () => 45.4, getNorth: () => 45.7 }),
      getCanvas: () => canvas,
      on: vi.fn((name, handler) => listeners.set(name, handler)),
      off: vi.fn(),
      removeLayer: vi.fn(id => layers.delete(id)),
      removeSource: vi.fn(id => sources.delete(id)),
      getZoom: vi.fn(() => 12), getMaxZoom: () => 22, easeTo: vi.fn(),
      queryRenderedFeatures: vi.fn()
    };
    const onCoincident = vi.fn();
    const onSelect = vi.fn();
    const onError = vi.fn();
    const hoverPlace = { ...park, name: "Example <img> Park", address: "100 <b>Main</b> Street" };
    act(() => root.render(<NearbyPlacesMap map={fakeMap as never} places={[hoverPlace, pod]} selectedId={park.id}
      onSelect={onSelect} onCoincident={onCoincident} onBounds={vi.fn()} onError={onError} />));
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
    const popup = vi.mocked(Popup).mock.results.slice(-1)[0].value;
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
      onSelect={onSelect} onCoincident={onCoincident} onBounds={vi.fn()} onError={onError} />));
    for (const suffix of ["clusters", "counts", "points", "icons", "selection"]) {
      expect(fakeMap.setLayoutProperty).toHaveBeenCalledWith(`nearby-places-food-cart-pod-${suffix}`, "visibility", "none");
    }
    expect(fakeMap.setLayoutProperty).toHaveBeenCalledWith("nearby-places-park-points", "visibility", "visible");
    fakeMap.setLayoutProperty.mockClear();
    act(() => root.render(<NearbyPlacesMap map={fakeMap as never} places={[hoverPlace, pod]} selectedId={park.id}
      onSelect={onSelect} onCoincident={onCoincident} onBounds={vi.fn()} onError={onError} />));
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
