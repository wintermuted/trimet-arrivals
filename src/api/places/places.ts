import { useEffect, useState } from "react";

export const PLACE_INFO = {
  park: { label: "Parks", singular: "Parks system site", icon: "tree", file: "parks.json", color: "#197346" },
  "food-cart-pod": { label: "Food-cart pods", singular: "Food-cart pod", icon: "cutlery", file: "food-cart-pods.json", color: "#a44c12" },
  "community-center": { label: "Community centers", singular: "Community center", icon: "users", file: "community-centers.json", color: "#7448a3" },
  library: { label: "Libraries", singular: "Public library", icon: "book", file: "libraries.json", color: "#176b95" }
} as const;
export type PlaceCategory = keyof typeof PLACE_INFO;
export type PlacePoint = [number, number];
export interface InterestPlace {
  id: string;
  name: string;
  category: PlaceCategory;
  coordinates: PlacePoint;
  arrival: "approximate";
  sourceUrl: string;
  address?: string;
  website?: string;
}
export interface PlaceSnapshot {
  version: 1;
  category: PlaceCategory;
  retrievedAt: string;
  sourceUpdatedAt?: string;
  source: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  coverage: string;
  places: InterestPlace[];
}
export interface PlaceSourceState {
  snapshot?: PlaceSnapshot;
  loading: boolean;
  error: boolean;
}
export const PLACE_CATEGORIES = Object.keys(PLACE_INFO) as PlaceCategory[];
export const categoryName = (category: PlaceCategory) => PLACE_INFO[category].label;
export const categoryIcon = (category: PlaceCategory) => PLACE_INFO[category].icon;
export const emptyPlaceSources = (): Record<PlaceCategory, PlaceSourceState> => ({
  park: { loading: false, error: false }, "food-cart-pod": { loading: false, error: false },
  "community-center": { loading: false, error: false }, library: { loading: false, error: false }
});
export function placeCategoryForId(id: string): PlaceCategory | undefined {
  if (id?.startsWith("portland:park:")) return "park";
  if (id?.startsWith("metro:community-center:")) return "community-center";
  if (id?.startsWith("metro:library:")) return "library";
  if (/^osm:(node|way|relation):\d+$/.test(id || "")) return "food-cart-pod";
  return undefined;
}
const cache = new Map<PlaceCategory, PlaceSnapshot>();
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
export const safePlaceUrl = (value: unknown): value is string =>
  typeof value === "string" && /^https?:\/\//i.test(value);
export const validPlacePoint = (value: unknown): value is PlacePoint => Array.isArray(value) &&
  value.length === 2 && value.every(Number.isFinite) &&
  value[0] >= -123 && value[0] <= -122 && value[1] >= 45.3 && value[1] <= 45.8;

function isPlace(value: unknown, category: PlaceCategory): value is InterestPlace {
  return record(value) && typeof value.id === "string" && Boolean(value.id) &&
    placeCategoryForId(value.id) === category &&
    typeof value.name === "string" && Boolean(value.name.trim()) &&
    value.category === category && validPlacePoint(value.coordinates) &&
    value.arrival === "approximate" && safePlaceUrl(value.sourceUrl) &&
    (value.address === undefined || typeof value.address === "string") &&
    (value.website === undefined || safePlaceUrl(value.website));
}

export function parsePlaceSnapshot(value: unknown, category: PlaceCategory): PlaceSnapshot {
  if (!record(value) || value.version !== 1 || value.category !== category ||
      typeof value.retrievedAt !== "string" || !Number.isFinite(Date.parse(value.retrievedAt)) ||
      (value.sourceUpdatedAt !== undefined &&
        (typeof value.sourceUpdatedAt !== "string" || !Number.isFinite(Date.parse(value.sourceUpdatedAt)))) ||
      typeof value.source !== "string" || !safePlaceUrl(value.sourceUrl) ||
      typeof value.license !== "string" || !safePlaceUrl(value.licenseUrl) ||
      typeof value.coverage !== "string" || !Array.isArray(value.places) ||
      !value.places.length || !value.places.every(place => isPlace(place, category)) ||
      new Set(value.places.map(place => place.id)).size !== value.places.length) {
    throw new Error(`Invalid ${category} snapshot`);
  }
  // All fields were validated above; return a typed record without trusting fetch's JSON type.
  return {
    version: 1, category, retrievedAt: value.retrievedAt,
    sourceUpdatedAt: value.sourceUpdatedAt as string | undefined,
    source: value.source, sourceUrl: value.sourceUrl, license: value.license,
    licenseUrl: value.licenseUrl, coverage: value.coverage,
    places: value.places as InterestPlace[]
  };
}

export async function loadPlaceSnapshot(category: PlaceCategory, signal?: AbortSignal, refresh = false) {
  if (!refresh && cache.has(category)) return cache.get(category);
  const response = await fetch(`${(process.env.PUBLIC_URL || "").replace(/\/$/, "")}/data/places/${PLACE_INFO[category].file}`, {
    signal, ...(refresh ? { cache: "reload" as const } : {})
  });
  if (!response.ok) throw new Error(`Could not load ${categoryName(category)}`);
  const snapshot = parsePlaceSnapshot(await response.json(), category);
  if (!signal?.aborted) cache.set(category, snapshot);
  return snapshot;
}

export function usePlaceCatalog(enabled: boolean) {
  const [sources, setSources] = useState(emptyPlaceSources);
  const [retries, setRetries] = useState({ park: 0, "food-cart-pod": 0, "community-center": 0, library: 0 });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    PLACE_CATEGORIES.forEach(category => {
      setSources(previous => ({ ...previous, [category]: { ...previous[category], loading: true, error: false } }));
      loadPlaceSnapshot(category, controller.signal, retries[category] > 0)
        .then(snapshot => {
          if (!controller.signal.aborted) {
            setSources(previous => ({ ...previous, [category]: { snapshot, loading: false, error: false } }));
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSources(previous => ({ ...previous, [category]: { ...previous[category], loading: false, error: true } }));
          }
        });
    });
    return () => controller.abort();
  }, [enabled, retries]);
  return {
    sources,
    places: PLACE_CATEGORIES.flatMap(category => sources[category].snapshot?.places ?? []),
    retry: (category: PlaceCategory) => setRetries(previous => ({ ...previous, [category]: previous[category] + 1 }))
  };
}

export type PlaceFilters = Record<PlaceCategory, boolean> & { search: string };
export const DEFAULT_PLACE_FILTERS: PlaceFilters = { park: true, "food-cart-pod": true, "community-center": true, library: true, search: "" };
export function filterPlaces(places: InterestPlace[], filters: PlaceFilters) {
  const query = filters.search.trim().toLocaleLowerCase();
  return places.filter(place => filters[place.category] &&
    `${place.name} ${place.address || ""}`.toLocaleLowerCase().includes(query));
}
export function placeInBounds(place: InterestPlace, bounds: [number, number, number, number]) {
  const [lng, lat] = place.coordinates;
  return lng >= bounds[0] && lng <= bounds[2] && lat >= bounds[1] && lat <= bounds[3];
}
export function placePlannerLink(place: InterestPlace, origin?: number[], originMode?: string) {
  const params = new URLSearchParams({
    toPlaceId: place.id, toCoord: place.coordinates.join(","), confirmPlace: "1"
  });
  if (origin?.length === 2 && origin.every(Number.isFinite)) {
    params.set("fromCoord", origin.join(","));
    if (originMode && ["device", "area", "pin"].includes(originMode)) params.set("fromOrigin", originMode);
  }
  return `/nearby/planner?${params}`;
}
