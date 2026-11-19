import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import {
  DEFAULT_PLACE_FILTERS, emptyPlaceSources, filterPlaces, InterestPlace, parsePlaceSnapshot, placeCategoryForId,
  placeInBounds, placePlannerLink, PlaceSnapshot
} from "../api/places/places";
import { Popup } from "mapbox-gl";
import NearbyPlaces from "../view/nearby/components/NearbyPlaces";
import NearbyPlacesMap, { placeFeatures } from "../view/nearby/components/NearbyPlacesMap";
jest.mock("../view/nearby/util/mapbox/placeIcons", () => ({
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
const snapshot: PlaceSnapshot = {
  version: 1, category: "park", retrievedAt: "2026-11-18T12:00:00Z",
  source: "City of Portland", sourceUrl: "https://www.portlandmaps.com/",
  license: "PDDL-1.0", licenseUrl: "https://opendatacommons.org/licenses/pddl/1-0/",
  coverage: "Test parks", places: [park]
};

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

  it("validates category data, rejects duplicates, invalid coordinates and unsafe URLs", () => {
    expect(parsePlaceSnapshot(snapshot, "park").places).toEqual([park]);
    expect(() => parsePlaceSnapshot({ ...snapshot, places: [park, park] }, "park")).toThrow();
    expect(() => parsePlaceSnapshot({ ...snapshot, places: [{ ...park, coordinates: [45.52, -122.67] }] }, "park")).toThrow();
    expect(() => parsePlaceSnapshot({ ...snapshot, places: [{ ...park, website: "javascript:alert(1)" }] }, "park")).toThrow();
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

  it("exposes accessible individual results and route context even when one source failed", () => {
    const select = jest.fn();
    const retry = jest.fn();
    function Harness() {
      const [selected, setSelected] = React.useState<InterestPlace>();
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
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(4);
    const button = container.querySelector<HTMLButtonElement>(".transit-place-result");
    act(() => button.click());
    expect(select).toHaveBeenCalledWith(park.id, true);
    const link = container.querySelector<HTMLAnchorElement>('a[href*="toPlaceId"]');
    expect(link.search).toContain("toPlaceId=portland%3Apark%3A1");
    expect(container.textContent).toContain("not a verified public entrance");
    act(() => Array.from(container.querySelectorAll("button")).find(item => item.textContent === "Retry food-cart pods").click());
    expect(retry).toHaveBeenCalledWith("food-cart-pod");
    expect(document.activeElement.id).toBe("selected-place-heading");
    expect(container.querySelector(".transit-places-list")).toBeNull();
    act(() => Array.from(container.querySelectorAll("button")).find(item => item.textContent.includes("Back to places")).click());
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
    expect(images.size).toBe(4);
    expect(fakeMap.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: "nearby-places-park-counts",
      layout: expect.objectContaining({ "icon-image": "nearby-places-park-icon", "text-field": ["get", "point_count_abbreviated"] })
    }));
    expect(fakeMap.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: "nearby-places-food-cart-pod-icons",
      layout: expect.objectContaining({ "icon-image": "nearby-places-food-cart-pod-icon" })
    }));
    for (const category of ["community-center", "library"]) {
      expect(fakeMap.addLayer).toHaveBeenCalledWith(expect.objectContaining({
        id: `nearby-places-${category}-counts`,
        layout: expect.objectContaining({ "icon-image": `nearby-places-${category}-icon` })
      }));
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
    sources.clear(); layers.clear(); images.clear();
    act(() => listeners.get("style.load")());
    expect(sources.size).toBe(4);
    expect(onError).not.toHaveBeenCalledWith(true);
    act(() => root.render(null));
    expect(sources.size).toBe(0);
    expect(layers.size).toBe(0);
    expect(images.size).toBe(0);
    expect(fakeMap.off).toHaveBeenCalledTimes(5);
  });
});
