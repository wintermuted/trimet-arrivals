import { Position } from "geojson";
import { CONTEXT_CATEGORIES, ContextCategory, DEFAULT_CONTEXT_OVERLAYS } from "./contextOverlays";
import { DEFAULT_LINE_OVERLAYS, LINE_OVERLAY_CATEGORIES, LineOverlayCategory } from "./lineOverlays";
import { DEFAULT_PLACE_FILTERS, PLACE_CATEGORIES, PlaceCategory, PlaceFilters } from "./places";

export interface PlacesView {
  filters: PlaceFilters;
  neighborhoods: boolean;
  polygons: boolean;
  lines: Record<LineOverlayCategory, boolean>;
  context: Record<ContextCategory, boolean>;
}
export interface PlacesViewport { center: [number, number]; zoom: number }
export interface TripCorridor {
  lines: Position[][];
  incomplete: boolean;
  returnTo: string;
}
export const DEFAULT_PLACES_VIEW: PlacesView = {
  filters: DEFAULT_PLACE_FILTERS, neighborhoods: false, polygons: false,
  lines: DEFAULT_LINE_OVERLAYS, context: DEFAULT_CONTEXT_OVERLAYS
};
export const PLACE_PRESETS = [
  { id: "parks", label: "Park day" },
  { id: "errands", label: "Errands" },
  { id: "cycling", label: "Bike outing" }
] as const;
export type PlacePreset = typeof PLACE_PRESETS[number]["id"] | "default";

export function placesPreset(preset: PlacePreset): PlacesView {
  const view: PlacesView = {
    ...DEFAULT_PLACES_VIEW, filters: { ...DEFAULT_PLACE_FILTERS },
    lines: { ...DEFAULT_LINE_OVERLAYS }, context: { ...DEFAULT_CONTEXT_OVERLAYS }
  };
  if (preset === "default") return view;
  const categories: PlaceCategory[] = preset === "parks"
    ? ["park", "community-garden", "heritage-tree", "drinking-fountain", "public-restroom", "picnic-seating", "park-artwork"]
    : preset === "errands"
      ? ["grocery-store", "farmers-market", "reuse-repair", "csa-pickup", "library", "community-center"]
      : ["park", "food-cart-pod", "bicycle-parking", "drinking-fountain", "public-restroom"];
  PLACE_CATEGORIES.forEach(category => { view.filters[category] = categories.includes(category); });
  if (preset === "parks") view.lines["park-trails"] = true;
  if (preset === "cycling") {
    view.lines["bicycle-network"] = true;
    view.lines["recommended-bike-routes"] = true;
  }
  return view;
}
const layerNames = ["neighborhoods", "neighborhood-polygons", ...LINE_OVERLAY_CATEGORIES, ...CONTEXT_CATEGORIES];
export function placesViewSearch(view: PlacesView, viewport?: PlacesViewport) {
  const layers = [
    ...(view.neighborhoods ? ["neighborhoods", ...(view.polygons ? ["neighborhood-polygons"] : [])] : []),
    ...LINE_OVERLAY_CATEGORIES.filter(category => view.lines[category]),
    ...CONTEXT_CATEGORIES.filter(category => view.context[category])
  ];
  const params = new URLSearchParams({
    view: "1", categories: PLACE_CATEGORIES.filter(category => view.filters[category]).join(","),
    layers: layers.join(",")
  });
  if (view.filters.search) params.set("q", view.filters.search);
  if (viewport) params.set("map", [...viewport.center.map(value => Number(value.toFixed(5))), Number(viewport.zoom.toFixed(2))].join(","));
  return `?${params}`;
}
export function readPlacesView(search: string): { view?: PlacesView; viewport?: PlacesViewport; error?: string } {
  const params = new URLSearchParams(search);
  if (!params.has("view")) return {};
  try {
    if (search.length > 4096 || params.getAll("view").length !== 1 || params.get("view") !== "1" ||
      ["categories", "layers"].some(key => params.getAll(key).length !== 1) ||
      ["q", "map"].some(key => params.getAll(key).length > 1)) throw new Error("Invalid view settings");
    const categories = params.get("categories")?.split(",").filter(Boolean) || [];
    const layers = params.get("layers")?.split(",").filter(Boolean) || [];
    if (categories.some(category => !PLACE_CATEGORIES.some(known => known === category)) ||
      layers.some(layer => !layerNames.includes(layer)) || new Set(categories).size !== categories.length ||
      new Set(layers).size !== layers.length || (params.get("q") || "").length > 200 ||
      (layers.includes("neighborhood-polygons") && !layers.includes("neighborhoods"))) throw new Error("Invalid filters or layers");
    const view = placesPreset("default");
    PLACE_CATEGORIES.forEach(category => { view.filters[category] = categories.includes(category); });
    view.filters.search = params.get("q") || "";
    view.neighborhoods = layers.includes("neighborhoods");
    view.polygons = layers.includes("neighborhood-polygons");
    LINE_OVERLAY_CATEGORIES.forEach(category => { view.lines[category] = layers.includes(category); });
    CONTEXT_CATEGORIES.forEach(category => { view.context[category] = layers.includes(category); });
    let viewport: PlacesViewport;
    if (params.has("map")) {
      const parts = params.get("map").split(",");
      const values = parts.map(Number);
      if (parts.length !== 3 || parts.some(value => !value.trim()) || !values.every(Number.isFinite) ||
        Math.abs(values[0]) > 180 || Math.abs(values[1]) > 85 || values[2] < 0 || values[2] > 22) throw new Error("Invalid map position");
      viewport = { center: [values[0], values[1]], zoom: values[2] };
    }
    return { view, viewport };
  } catch {
    return { error: "This shared Places view has invalid or unsupported settings. The current filters have not been replaced. Choose a preset or Reset filters to continue." };
  }
}

export function currentPlacePreset(view: PlacesView): PlacePreset | "custom" {
  const signature = placesViewSearch(view);
  return (["default", ...PLACE_PRESETS.map(preset => preset.id)] as PlacePreset[])
    .find(preset => placesViewSearch(placesPreset(preset)) === signature) || "custom";
}

// A local metric projection is sufficient for approximate discovery within Portland.
export function tripCorridorMatcher(lines: Position[][], meters: number) {
  const scale = Math.PI / 180 * 6371008.8;
  const xScale = scale * Math.cos(45.55 * Math.PI / 180);
  const segments = lines.flatMap(line => line.slice(1).map((end, index) => {
    const start = line[index];
    return [start[0] * xScale, start[1] * scale, end[0] * xScale, end[1] * scale];
  }));
  return ([lng, lat]: number[]) => {
    const x = lng * xScale, y = lat * scale;
    return segments.some(([ax, ay, bx, by]) => {
      if (x < Math.min(ax, bx) - meters || x > Math.max(ax, bx) + meters ||
        y < Math.min(ay, by) - meters || y > Math.max(ay, by) + meters) return false;
      const dx = bx - ax, dy = by - ay;
      const length = dx * dx + dy * dy;
      const t = length ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length)) : 0;
      return Math.hypot(x - ax - t * dx, y - ay - t * dy) <= meters;
    });
  };
}
