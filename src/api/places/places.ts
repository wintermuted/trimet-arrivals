import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const PLACE_INFO = {
  park: { label: "Parks", singular: "Parks system site", icon: "tree", file: "parks.json", color: "#197346" },
  "food-cart-pod": { label: "Food-cart pods", singular: "Food-cart pod", icon: "cutlery", file: "food-cart-pods.json", color: "#a44c12" },
  "community-center": { label: "Community centers", singular: "Community center", icon: "users", file: "community-centers.json", color: "#7448a3" },
  library: { label: "Libraries", singular: "Public library", icon: "book", file: "libraries.json", color: "#176b95" },
  "community-garden": { label: "Community gardens", singular: "Community garden", icon: "leaf", file: "community-gardens.json", color: "#526d16" },
  "farmers-market": { label: "Farmers markets", singular: "Farmers market", icon: "shopping-basket", file: "farmers-markets.json", color: "#a32d58" },
  "public-restroom": { label: "Public restrooms", singular: "Parks-system restroom", icon: "restroom", file: "public-restrooms.json", color: "#1d6b73" },
  "heritage-tree": { label: "Heritage trees", singular: "Heritage tree", icon: "seedling", file: "heritage-trees.json", color: "#82561d" },
  "grocery-store": { label: "Grocery stores", singular: "Grocery store", icon: "shopping-cart", file: "grocery-stores.json", color: "#9d3e2f" },
  "reuse-repair": { label: "Reuse & repair", singular: "Resourceful PDX organization", icon: "recycle", file: "reuse-repair.json", color: "#336b43" },
  "csa-pickup": { label: "CSA pickups", singular: "CSA pickup site", icon: "carrot", file: "csa-pickups.json", color: "#8a6413" },
  "bicycle-parking": { label: "Bicycle parking", singular: "Bicycle rack", icon: "bicycle", file: "bicycle-parking.json", color: "#365eb0" },
  "drinking-fountain": { label: "Drinking fountains", singular: "Parks drinking-fountain asset", icon: "faucet-drip", file: "drinking-fountain.json", color: "#176b95" },
  "picnic-seating": { label: "Picnic & seating", singular: "Park table or bench", icon: "chair", file: "picnic-seating.json", color: "#805e32" },
  "park-artwork": { label: "Park artwork", singular: "Park artwork asset", icon: "palette", file: "park-artwork.json", color: "#8a4389" },
  museum: { label: "Museums", singular: "Museum", icon: "landmark", file: "museums.json", color: "#856019" },
  "art-gallery": { label: "Art galleries", singular: "Art gallery", icon: "images", file: "art-galleries.json", color: "#995388" },
  theatre: { label: "Theatres", singular: "Theatre / performing arts venue", icon: "masks-theater", file: "theatres.json", color: "#884758" },
  "arts-centre": { label: "Arts & cultural centres", singular: "Arts / cultural centre", icon: "paintbrush", file: "arts-centres.json", color: "#4f5c99" },
  viewpoint: { label: "Viewpoints & observation decks", singular: "Viewpoint / observation deck", icon: "binoculars", file: "viewpoints.json", color: "#296678" },
  playground: { label: "Playgrounds", singular: "Playground", icon: "child-reaching", file: "playgrounds.json", color: "#a44c12" },
  "splash-pad": { label: "Splash pads", singular: "Splash pad", icon: "water", file: "splash-pads.json", color: "#176b95" },
  "historic-site": { label: "Historic landmarks & monuments", singular: "Historic landmark / monument", icon: "monument", file: "historic-sites.json", color: "#805e32" },
  "public-art": { label: "Public art & murals", singular: "Source-mapped artwork / mural", icon: "spray-can", file: "public-art.json", color: "#8a4389" },
  "sports-court": { label: "Sports courts", singular: "Sports court", icon: "basketball", file: "sports-courts.json", color: "#9d3e2f" },
  skatepark: { label: "Skateparks", singular: "Skatepark", icon: "person-skating", file: "skateparks.json", color: "#4f5c99" },
  "public-garden": { label: "Visitor gardens", singular: "Visitor garden", icon: "spa", file: "public-gardens.json", color: "#526d16" },
  "nature-reserve": { label: "Nature reserves", singular: "Nature reserve", icon: "mountain-sun", file: "nature-reserves.json", color: "#336b43" },
  cafe: { label: "Cafés", singular: "Café", icon: "mug-saucer", file: "cafes.json", color: "#82561d" },
  bakery: { label: "Bakeries", singular: "Bakery", icon: "bread-slice", file: "bakeries.json", color: "#8a6413" }
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
  parkPropertyId?: number;
  marketDays?: string;
  marketSeason?: string;
  marketHours?: string;
  restroomStatus?: "listed-24-7" | "unknown";
  restroomAda?: "yes" | "no" | "unknown";
  scientificName?: string;
  treeOwnership?: string;
  reuseServices?: string;
  reuseItems?: string;
  pickupSeason?: string;
  pickupProducts?: string;
  bikeSpaces?: number;
  bikeCovered?: "yes" | "no" | "unknown";
  amenityType?: "Drinking Fountain" | "Picnic Table" | "Bench" | "Art Work";
  amenityStyle?: string;
  siteType?: string;
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
export const CULTURE_PLACE_CATEGORIES: PlaceCategory[] = ["museum", "art-gallery", "theatre", "arts-centre"];
export const OUTING_PLACE_CATEGORIES: PlaceCategory[] = ["viewpoint", "playground", "splash-pad", "historic-site", "public-art",
  "sports-court", "skatepark", "public-garden", "nature-reserve", "cafe", "bakery"];
export const OSM_PLACE_CATEGORIES: PlaceCategory[] = ["food-cart-pod", ...CULTURE_PLACE_CATEGORIES, ...OUTING_PLACE_CATEGORIES];
export const categoryName = (category: PlaceCategory) => PLACE_INFO[category].label;
export const categoryIcon = (category: PlaceCategory) => PLACE_INFO[category].icon;
export const emptyPlaceSources = (): Record<PlaceCategory, PlaceSourceState> => ({
  park: { loading: false, error: false }, "food-cart-pod": { loading: false, error: false },
  "community-center": { loading: false, error: false }, library: { loading: false, error: false },
  "community-garden": { loading: false, error: false }, "farmers-market": { loading: false, error: false },
  "public-restroom": { loading: false, error: false }, "heritage-tree": { loading: false, error: false },
  "grocery-store": { loading: false, error: false }, "reuse-repair": { loading: false, error: false },
  "csa-pickup": { loading: false, error: false }, "bicycle-parking": { loading: false, error: false },
  "drinking-fountain": { loading: false, error: false }, "picnic-seating": { loading: false, error: false },
  "park-artwork": { loading: false, error: false },
  museum: { loading: false, error: false }, "art-gallery": { loading: false, error: false },
  theatre: { loading: false, error: false }, "arts-centre": { loading: false, error: false },
  viewpoint: { loading: false, error: false }, playground: { loading: false, error: false },
  "splash-pad": { loading: false, error: false }, "historic-site": { loading: false, error: false },
  "public-art": { loading: false, error: false }, "sports-court": { loading: false, error: false },
  skatepark: { loading: false, error: false }, "public-garden": { loading: false, error: false },
  "nature-reserve": { loading: false, error: false }, cafe: { loading: false, error: false }, bakery: { loading: false, error: false }
});
export function placeCategoryForId(id: string): PlaceCategory | undefined {
  if (id?.startsWith("portland:park:")) return "park";
  if (id?.startsWith("metro:community-center:")) return "community-center";
  if (id?.startsWith("metro:library:")) return "library";
  if (/^portland:garden:[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id || "")) return "community-garden";
  if (/^portland:market:\d+$/.test(id || "")) return "farmers-market";
  if (/^portland:restroom:[1-9]\d*$/.test(id || "")) return "public-restroom";
  if (/^portland:tree:[1-9]\d*$/.test(id || "")) return "heritage-tree";
  if (/^portland:grocery:[1-9]\d*$/.test(id || "")) return "grocery-store";
  if (/^portland:reuse:[1-9]\d*$/.test(id || "")) return "reuse-repair";
  if (/^portland:csa:[1-9]\d*$/.test(id || "")) return "csa-pickup";
  if (/^portland:bike:[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(id || "")) return "bicycle-parking";
  const amenity = /^portland:(drinking-fountain|picnic-seating|park-artwork):[1-9]\d*$/.exec(id || "");
  if (amenity) return amenity[1] as PlaceCategory;
  const osm = /^osm:([a-z-]+):(node|way|relation):([1-9]\d*)$/.exec(id || "");
  if (osm && Number.isSafeInteger(Number(osm[3]))) {
    return [...CULTURE_PLACE_CATEGORIES, ...OUTING_PLACE_CATEGORIES].find(category => category === osm[1]);
  }
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
    (value.website === undefined || safePlaceUrl(value.website)) &&
    (value.parkPropertyId === undefined || (category === "community-garden" &&
      Number.isInteger(value.parkPropertyId) && Number(value.parkPropertyId) > 0)) &&
    ["marketDays", "marketSeason", "marketHours"].every(key => value[key] === undefined ||
      (category === "farmers-market" && typeof value[key] === "string")) &&
    (value.restroomStatus === undefined || (category === "public-restroom" && typeof value.restroomStatus === "string" &&
      ["listed-24-7", "unknown"].includes(value.restroomStatus))) &&
    (value.restroomAda === undefined || (category === "public-restroom" && typeof value.restroomAda === "string" &&
      ["yes", "no", "unknown"].includes(value.restroomAda))) &&
    ["scientificName", "treeOwnership"].every(key => value[key] === undefined ||
      (category === "heritage-tree" && typeof value[key] === "string")) &&
    ["reuseServices", "reuseItems"].every(key => value[key] === undefined ||
      (category === "reuse-repair" && typeof value[key] === "string")) &&
    ["pickupSeason", "pickupProducts"].every(key => value[key] === undefined ||
      (category === "csa-pickup" && typeof value[key] === "string")) &&
    (value.bikeSpaces === undefined || (category === "bicycle-parking" &&
      Number.isInteger(value.bikeSpaces) && Number(value.bikeSpaces) >= 0)) &&
    (value.bikeCovered === undefined || (category === "bicycle-parking" && typeof value.bikeCovered === "string" &&
      ["yes", "no", "unknown"].includes(value.bikeCovered))) &&
    (value.amenityType === undefined || (
      category === "drinking-fountain" ? value.amenityType === "Drinking Fountain" :
      category === "picnic-seating" ? ["Picnic Table", "Bench"].includes(String(value.amenityType)) :
      category === "park-artwork" && value.amenityType === "Art Work")) &&
    (value.amenityStyle === undefined || (["drinking-fountain", "picnic-seating", "park-artwork"].includes(category) &&
      typeof value.amenityStyle === "string")) &&
    (value.siteType === undefined || (OUTING_PLACE_CATEGORIES.includes(category) &&
      typeof value.siteType === "string" && Boolean(value.siteType.trim())));
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
  const requests = useRef(new Map<PlaceCategory, AbortController>());
  const load = useCallback((category: PlaceCategory, refresh = false) => {
    requests.current.get(category)?.abort();
    const controller = new AbortController();
    requests.current.set(category, controller);
    setSources(previous => ({ ...previous, [category]: { ...previous[category], loading: true, error: false } }));
    loadPlaceSnapshot(category, controller.signal, refresh)
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
  }, []);
  useEffect(() => {
    if (!enabled) return;
    PLACE_CATEGORIES.forEach(category => load(category));
    const active = requests.current;
    return () => { active.forEach(controller => controller.abort()); active.clear(); };
  }, [enabled, load]);
  const places = useMemo(() => PLACE_CATEGORIES.flatMap(category => sources[category].snapshot?.places ?? []), [sources]);
  return {
    sources,
    places,
    retry: (category: PlaceCategory) => load(category, true)
  };
}

export type PlaceFilters = Record<PlaceCategory, boolean> & { search: string };
export const DEFAULT_PLACE_FILTERS: PlaceFilters = { park: true, "food-cart-pod": true, "community-center": true,
  library: true, "community-garden": true, "farmers-market": true, "public-restroom": true, "heritage-tree": true,
  "grocery-store": true, "reuse-repair": true, "csa-pickup": true, "bicycle-parking": false,
  "drinking-fountain": true, "picnic-seating": false, "park-artwork": true,
  museum: true, "art-gallery": true, theatre: true, "arts-centre": true,
  viewpoint: true, playground: true, "splash-pad": true, "historic-site": true, "public-art": true,
  "sports-court": true, skatepark: true, "public-garden": true, "nature-reserve": true, cafe: false, bakery: false, search: "" };
const placeSearchText = (place: InterestPlace) =>
  `${place.name} ${place.address || ""} ${place.scientificName || ""} ${place.reuseServices || ""} ${place.reuseItems || ""} ${place.pickupProducts || ""} ${place.amenityType || ""} ${place.amenityStyle || ""} ${place.siteType || ""}`;

export function searchPlaces(places: InterestPlace[], search: string) {
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const query = normalize(search.trim());
  if (!query) return [];
  const terms = query.split(/\s+/);
  const rank = (place: InterestPlace) => {
    const name = normalize(place.name);
    return name === query ? 0 : name.startsWith(query) ? 1 : name.includes(query) ? 2 : 3;
  };
  return places.filter(place => {
    const text = normalize(`${placeSearchText(place)} ${PLACE_INFO[place.category].label} ${PLACE_INFO[place.category].singular}`);
    return terms.every(term => text.includes(term));
  }).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export function filterPlaces(places: InterestPlace[], filters: PlaceFilters, deduplicate = true) {
  const query = filters.search.trim().toLocaleLowerCase();
  const gardenProperties = new Set(places.filter(place => place.category === "community-garden")
    .map(place => place.parkPropertyId).filter(id => id !== undefined));
  const matches = places.filter(place => !(place.category === "park" && /\bcommunity garden\b/i.test(place.name) &&
      gardenProperties.has(Number(place.id.replace("portland:park:", "")))) &&
    filters[place.category] &&
    placeSearchText(place).toLocaleLowerCase().includes(query));
  if (!deduplicate) return matches;
  const existing = matches.filter(place => ["park", "community-garden", "park-artwork"].includes(place.category));
  const normalizedName = (name: string) => name.toLocaleLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
  return matches.filter(place => {
    const equivalents: PlaceCategory[] = place.category === "public-art" ? ["park-artwork"] :
      ["public-garden", "nature-reserve"].includes(place.category) ? ["park", "community-garden"] : [];
    if (!equivalents.length) return true;
    return !existing.some(other => equivalents.includes(other.category) && normalizedName(place.name) === normalizedName(other.name) &&
      Math.hypot((place.coordinates[0] - other.coordinates[0]) * 78000, (place.coordinates[1] - other.coordinates[1]) * 111000) <= 120);
  });
}
export function placeInBounds(place: InterestPlace, bounds: [number, number, number, number]) {
  const [lng, lat] = place.coordinates;
  return lng >= bounds[0] && lng <= bounds[2] && lat >= bounds[1] && lat <= bounds[3];
}
export function placeDetailLink(id: string, viewSearch = "") {
  return `/nearby/places/${encodeURIComponent(id)}${viewSearch}`;
}
export function placePlannerLink(place: InterestPlace, origin?: number[], originMode?: string, viewSearch?: string) {
  const params = new URLSearchParams({
    toPlaceId: place.id, toCoord: place.coordinates.join(","), confirmPlace: "1"
  });
  if (viewSearch) params.set("placesView", viewSearch);
  if (origin?.length === 2 && origin.every(Number.isFinite)) {
    params.set("fromCoord", origin.join(","));
    if (originMode && ["device", "area", "pin"].includes(originMode)) params.set("fromOrigin", originMode);
  }
  return `/nearby/planner?${params}`;
}
