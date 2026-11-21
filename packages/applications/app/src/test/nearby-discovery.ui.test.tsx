import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { currentPlacePreset, placesPreset, placesViewSearch, readPlacesView, tripCorridorMatcher } from "@trimet-arrivals/places/discovery";
import { InterestPlace, OUTING_PLACE_CATEGORIES, PLACE_CATEGORIES } from "@trimet-arrivals/places/catalog";
import { readSavedPlaces, SAVED_PLACES_KEY, useSavedPlaces } from "@trimet-arrivals/places/savedPlaces";
import NearbyDiscoveryControls from "../view/nearby/components/NearbyDiscoveryControls";
import NearbyPlannerPaths from "../view/nearby/components/NearbyPlannerPaths";
import { loadPlannerPaths } from "../view/nearby/util/mapbox/plannerPaths";
import { TripPlannerItinerary } from "../api/trimet/tripplanner";

jest.mock("mapbox-gl", () => ({}));
jest.mock("../view/nearby/util/mapbox/plannerPaths", () => ({ loadPlannerPaths: jest.fn() }));
const park: InterestPlace = { id: "portland:park:1", category: "park", name: "Example Park",
  coordinates: [-122.67, 45.55], sourceUrl: "https://www.portlandmaps.com/", arrival: "approximate" };

describe("Places discovery tools", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it("round-trips empty categories, all layer types, Unicode search and map position without sharing saved data", () => {
    const view = placesPreset("cycling");
    PLACE_CATEGORIES.forEach(category => { view.filters[category] = false; });
    view.filters.search = "garden & café";
    view.neighborhoods = true;
    view.polygons = true;
    view.context.sidewalks = true;
    const viewport = { center: [-122.67, 45.55] as [number, number], zoom: 14.5 };
    const search = placesViewSearch(view, viewport);
    expect(readPlacesView(search)).toEqual({ view, viewport });
    expect(search).not.toMatch(/saved|fromCoord|trip/);
    expect(readPlacesView("?from=101")).toEqual({});
  });

  it("round-trips cultural filters and saves without confusing qualified IDs with legacy food pods", () => {
    const view = placesPreset("default");
    const cultures = ["museum", "art-gallery", "theatre", "arts-centre"];
    PLACE_CATEGORIES.forEach(category => { view.filters[category] = cultures.includes(category); });
    expect(readPlacesView(placesViewSearch(view)).view).toEqual(view);
    const saved = cultures.map((category, i) => ({ id: `osm:${category}:node:${i + 1}`, name: `Example ${category}` }));
    saved.push({ id: "osm:node:1", name: "Existing food carts" });
    localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(saved));
    expect(readSavedPlaces()).toEqual(Object.fromEntries(saved.map(place => [place.id, place.name])));
  });

  it("round-trips all outing filters and stable saved identities", () => {
    const view = placesPreset("default");
    PLACE_CATEGORIES.forEach(category => { view.filters[category] = OUTING_PLACE_CATEGORIES.includes(category); });
    expect(readPlacesView(placesViewSearch(view)).view).toEqual(view);
    const saved = OUTING_PLACE_CATEGORIES.map((category, i) => ({ id: `osm:${category}:way:${i + 1}`, name: `Example ${category}` }));
    localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(saved));
    expect(readSavedPlaces()).toEqual(Object.fromEntries(saved.map(place => [place.id, place.name])));
  });

  it.each([
    "?view=2&categories=park&layers=", "?view=1&view=1&categories=park&layers=",
    "?view=1&categories=park,unknown&layers=", "?view=1&categories=park,park&layers=",
    "?view=1&categories=park&layers=unknown", "?view=1&categories=park&layers=neighborhood-polygons",
    "?view=1&categories=park&layers=&map=,45,14", "?view=1&categories=park&layers=&map=-122,45,99",
    "?view=1&categories=park&layers=&map=999,45,14", "?view=1&categories=park&layers=&q=" + "a".repeat(201)
  ])("reports unsupported shared settings without applying partial values: %s", search => {
    expect(readPlacesView(search)).toEqual({ error: expect.stringContaining("invalid or unsupported") });
  });

  it("applies deliberate preset categories and reference layers, and recognizes customized views", () => {
    const parks = placesPreset("parks"), errands = placesPreset("errands"), cycling = placesPreset("cycling");
    expect(parks.filters["picnic-seating"]).toBe(true);
    expect(parks.filters["bicycle-parking"]).toBe(false);
    expect(parks.lines["park-trails"]).toBe(true);
    expect(errands.filters["grocery-store"]).toBe(true);
    expect(errands.filters.park).toBe(false);
    expect(cycling.lines["recommended-bike-routes"]).toBe(true);
    expect(cycling.filters["bicycle-parking"]).toBe(true);
    expect(cycling.context["street-trees"]).toBe(false);
    expect(currentPlacePreset(cycling)).toBe("cycling");
    cycling.filters.search = "water";
    expect(currentPlacePreset(cycling)).toBe("custom");
    expect(placesPreset("default").filters["picnic-seating"]).toBe(false);
  });

  it("measures distance to segment interiors and endpoints without bridging unmapped gaps", () => {
    const scale = Math.PI / 180 * 6371008.8;
    const near = tripCorridorMatcher([[[-122.7, 45.55], [-122.65, 45.55]]], 500);
    expect(near([-122.675, 45.55 + 499 / scale])).toBe(true);
    expect(near([-122.675, 45.55 + 501 / scale])).toBe(false);
    expect(near([-122.72, 45.55])).toBe(false);
    const gaps = tripCorridorMatcher([
      [[-122.7, 45.55], [-122.69, 45.55]], [[-122.6, 45.55], [-122.59, 45.55]]
    ], 250);
    expect(gaps([-122.645, 45.55])).toBe(false);
    expect(tripCorridorMatcher([], 500)(park.coordinates)).toBe(false);
  });

  function SavedHarness() {
    const controls = useSavedPlaces();
    return <><button onClick={() => controls.toggle(park)} aria-pressed={Boolean(controls.saved[park.id])}>Save</button>
      <output>{Object.keys(controls.saved).length}</output>{controls.error && <p role="alert">{controls.error}</p>}
      <button onClick={controls.retry}>Retry</button></>;
  }
  it("persists saves and removals, and incorporates another tab before writing", async () => {
    await act(async () => root.render(<SavedHarness />));
    await act(async () => container.querySelector("button").click());
    expect(readSavedPlaces()).toEqual({ [park.id]: park.name });
    const other = { id: "portland:park:2", name: "Other Park" };
    localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify([{ id: park.id, name: park.name }, other]));
    await act(async () => container.querySelector("button").click());
    expect(readSavedPlaces()).toEqual({ [other.id]: other.name });
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: SAVED_PLACES_KEY })));
    expect(container.querySelector("output").textContent).toBe("1");
    await act(async () => root.render(null));
    await act(async () => root.render(<SavedHarness />));
    expect(container.querySelector("output").textContent).toBe("1");
  });

  it("does not overwrite unreadable saved data and reports failed writes without optimistic success", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    localStorage.setItem(SAVED_PLACES_KEY, "broken");
    await act(async () => root.render(<SavedHarness />));
    expect(container.textContent).toContain("could not be read");
    await act(async () => container.querySelector("button").click());
    expect(localStorage.getItem(SAVED_PLACES_KEY)).toBe("broken");
    localStorage.removeItem(SAVED_PLACES_KEY);
    await act(async () => container.querySelectorAll("button")[1].click());
    jest.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("quota"); });
    await act(async () => container.querySelector("button").click());
    expect(container.textContent).toContain("Your changes were not saved");
    expect(container.querySelector("button").getAttribute("aria-pressed")).toBe("false");
    expect(readSavedPlaces()).toEqual({});
  });

  it("rejects malformed or duplicate saved records", () => {
    for (const value of [{}, [{ id: "unknown", name: "Bad" }],
      [{ id: park.id, name: park.name }, { id: park.id, name: park.name }]]) {
      localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(value));
      expect(readSavedPlaces).toThrow();
    }
  });

  it("copies a basename-aware view link and supplies manual copy when the clipboard is unavailable", async () => {
    const writeText = jest.fn().mockRejectedValueOnce(new Error("blocked")).mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const onPreset = jest.fn();
    const search = placesViewSearch(placesPreset("parks"));
    await act(async () => root.render(<MemoryRouter basename="/transit" initialEntries={["/transit/nearby/places"]}>
      <NearbyDiscoveryControls view={placesPreset("parks")} onPreset={onPreset} shareHref={`/nearby/places${search}`}
        savedPlaces={{ saved: {}, toggle: jest.fn(), remove: jest.fn(), retry: jest.fn() }}
        savedOnly={false} onSavedOnly={jest.fn()} unavailable={[]} alongTrip={false} onAlongTrip={jest.fn()}
        distance={500} onDistance={jest.fn()} />
    </MemoryRouter>));
    const copy = [...container.querySelectorAll("button")].find(button => button.textContent === "Copy view link");
    await act(async () => copy.click());
    expect(container.textContent).toContain("could not be copied");
    expect(container.querySelector<HTMLInputElement>("input[readonly]").value).toBe(`http://localhost/transit/nearby/places${search}`);
    await act(async () => copy.click());
    expect(container.textContent).toContain("View link copied");
    expect(container.querySelector("input[readonly]")).toBeNull();
    const select = container.querySelector("select");
    await act(async () => { select.value = "errands"; select.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(onPreset).toHaveBeenCalledWith("errands");
  });

  it("discovers only the selected mapped itinerary, not a hovered alternative, and identifies missing legs", async () => {
    const coordinates = [[-122.7, 45.55], [-122.65, 45.55]];
    const response: Awaited<ReturnType<typeof loadPlannerPaths>> = { data: { type: "FeatureCollection", features: [
      { type: "Feature", properties: { trip: 0, legIndex: 0, walk: false },
        geometry: { type: "LineString", coordinates: [[-122.5, 45.5], [-122.4, 45.5]] } },
      { type: "Feature", properties: { trip: 1, legIndex: 0, walk: false },
        geometry: { type: "LineString", coordinates } }
    ] } };
    jest.mocked(loadPlannerPaths).mockResolvedValue(response);
    const itineraries: TripPlannerItinerary[] = [
      { partial: false, legs: [{ partial: false }] },
      { partial: true, legs: [{ partial: false }, { partial: true }] }
    ];
    const discover = jest.fn();
    await act(async () => root.render(<NearbyPlannerPaths itineraries={itineraries} selected={1}
      previewTrip={0} walkingEnabled={false} onMapLeg={jest.fn()} onDiscoverPlaces={discover} />));
    await act(async () => container.querySelector("button").click());
    expect(discover).toHaveBeenCalledWith({ lines: [coordinates], incomplete: true });
    await act(async () => root.render(<NearbyPlannerPaths itineraries={itineraries} selected={-1}
      walkingEnabled={false} onMapLeg={jest.fn()} onDiscoverPlaces={discover} />));
    expect(container.querySelector("button")).toBeNull();
  });
});
