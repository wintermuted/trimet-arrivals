import { parsePlaceSnapshot } from "@trimet-arrivals/places/catalog";
import { placesPreset, placesViewSearch, readPlacesView } from "@trimet-arrivals/places/discovery";
import { readSavedPlaces, SAVED_PLACES_KEY } from "@trimet-arrivals/places/savedPlaces";

const cafes = require("../../../../public/data/places/cafes.json");

afterEach(() => localStorage.clear());

test("the public catalog and bookmark entry points agree on snapshot IDs", () => {
  const [cafe] = parsePlaceSnapshot(cafes, "cafe").places;
  localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify([{ id: cafe.id, name: cafe.name }]));
  expect(readSavedPlaces()).toEqual({ [cafe.id]: cafe.name });
});

test("the public discovery entry point round-trips a preset and viewport", () => {
  const view = placesPreset("cycling");
  const viewport = { center: [-122.68, 45.52] as [number, number], zoom: 13 };
  expect(readPlacesView(placesViewSearch(view, viewport))).toEqual({ view, viewport });
});
