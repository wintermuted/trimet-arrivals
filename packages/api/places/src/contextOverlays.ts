import { FeatureCollection, Point, Polygon, MultiPolygon } from "geojson";
import { useEffect, useRef, useState } from "react";
import { PlaceSnapshot, safePlaceUrl, validPlacePoint } from "./places";

export const CONTEXT_OVERLAY_INFO = {
  "street-trees": { label: "Street trees", color: "#23834b", minZoom: 14 },
  sidewalks: { label: "Sidewalks", color: "#247d98", minZoom: 14 },
  crossings: { label: "PedPDX crossings", color: "#684da8", minZoom: 13 },
  "crossing-deficiencies": { label: "Crossing deficiencies", color: "#ad541a", minZoom: 0 }
} as const;
export type ContextCategory = keyof typeof CONTEXT_OVERLAY_INFO;
export const CONTEXT_CATEGORIES = Object.keys(CONTEXT_OVERLAY_INFO) as ContextCategory[];
export const DEFAULT_CONTEXT_OVERLAYS: Record<ContextCategory, boolean> = {
  "street-trees": false, sidewalks: false, crossings: false, "crossing-deficiencies": false
};
export type MapBounds = [number, number, number, number];
interface ContextTile { file: string; bounds: MapBounds; count: number }
export interface ContextIndex extends Pick<PlaceSnapshot,
  "version" | "retrievedAt" | "source" | "sourceUrl" | "license" | "licenseUrl" | "coverage"> {
  category: ContextCategory;
  count: number;
  tiles: ContextTile[];
}
export type ContextFeatures = FeatureCollection<Point | Polygon | MultiPolygon, { name: string; detail: string }>;
export type ContextSnapshot = ContextFeatures & { category: ContextCategory };
export interface ContextState {
  index?: ContextIndex;
  snapshot?: ContextSnapshot;
  loading: boolean;
  error: boolean;
  zoomRequired: boolean;
  retry: () => void;
}
export interface ContextControls {
  shown: Record<ContextCategory, boolean>;
  sources: Record<ContextCategory, ContextState>;
  mapErrors: Record<ContextCategory, boolean>;
  onShown: (category: ContextCategory, shown: boolean) => void;
  onRetry: (category: ContextCategory) => void;
}
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const validBounds = (value: unknown): value is MapBounds => Array.isArray(value) && value.length === 4 &&
  validPlacePoint(value.slice(0, 2)) && validPlacePoint(value.slice(2)) && value[0] <= value[2] && value[1] <= value[3];
const validRing = (value: unknown) => Array.isArray(value) && value.length >= 4 &&
  value.every(validPlacePoint) && value[0].every((coordinate: number, i: number) => coordinate === value[value.length - 1][i]);
const validPolygon = (value: unknown) => Array.isArray(value) && value.length > 0 && value.every(validRing);
function validGeometry(value: unknown, category: ContextCategory): value is Point | Polygon | MultiPolygon {
  if (!record(value)) return false;
  return category === "sidewalks" ?
    (value.type === "Polygon" ? validPolygon(value.coordinates) :
      value.type === "MultiPolygon" && Array.isArray(value.coordinates) &&
      value.coordinates.length > 0 && value.coordinates.every(validPolygon)) :
    value.type === "Point" && validPlacePoint(value.coordinates);
}
export function parseContextIndex(value: unknown, category: ContextCategory): ContextIndex {
  if (!record(value) || value.version !== 1 || value.category !== category ||
    typeof value.retrievedAt !== "string" || !Number.isFinite(Date.parse(value.retrievedAt)) ||
    typeof value.source !== "string" || !safePlaceUrl(value.sourceUrl) ||
    typeof value.license !== "string" || !safePlaceUrl(value.licenseUrl) || typeof value.coverage !== "string" ||
    !Number.isInteger(value.count) || Number(value.count) <= 0 ||
    !Array.isArray(value.tiles) || !value.tiles.length ||
    !value.tiles.every(tile => record(tile) && typeof tile.file === "string" &&
      new RegExp(`^${category}-\\d+-\\d+-[a-f0-9]{12}\\.json$`).test(tile.file) &&
      validBounds(tile.bounds) && Number.isInteger(tile.count) && Number(tile.count) > 0) ||
    value.tiles.reduce((sum, tile) => sum + tile.count, 0) !== value.count ||
    new Set(value.tiles.map(tile => tile.file)).size !== value.tiles.length) throw new Error(`Invalid ${category} index`);
  return { version: 1, category, retrievedAt: value.retrievedAt, source: value.source, sourceUrl: value.sourceUrl,
    license: value.license, licenseUrl: value.licenseUrl, coverage: value.coverage,
    count: Number(value.count), tiles: value.tiles as ContextTile[] };
}
export function parseContextTile(value: unknown, category: ContextCategory, tile: ContextTile): ContextFeatures {
  if (!record(value) || value.type !== "FeatureCollection" || !Array.isArray(value.features) ||
    value.features.length !== tile.count || !value.features.every(feature => {
      if (!record(feature) || feature.type !== "Feature" || typeof feature.id !== "string" ||
        !new RegExp(`^portland:${category}:[1-9]\\d*$`).test(feature.id) ||
        !record(feature.properties) || typeof feature.properties.name !== "string" || !feature.properties.name.trim() ||
        typeof feature.properties.detail !== "string" || !record(feature.geometry)) return false;
      const g = feature.geometry;
      if (!validGeometry(g, category)) return false;
      const points: number[][] = g.type === "Point" ? [g.coordinates] :
        g.type === "Polygon" ? g.coordinates.flat() : g.coordinates.flat(2);
      return points.every(([lng, lat]) =>
        lng >= tile.bounds[0] && lng <= tile.bounds[2] && lat >= tile.bounds[1] && lat <= tile.bounds[3]);
    }) || new Set(value.features.map(feature => feature.id)).size !== value.features.length) {
    throw new Error(`Invalid ${category} tile`);
  }
  return { type: "FeatureCollection", features: value.features as ContextFeatures["features"] };
}
export const contextTileIntersects = (tile: ContextTile, bounds: MapBounds) =>
  tile.bounds[0] <= bounds[2] && tile.bounds[2] >= bounds[0] && tile.bounds[1] <= bounds[3] && tile.bounds[3] >= bounds[1];
const indexes = new Map<ContextCategory, ContextIndex>();
const tiles = new Map<string, ContextFeatures>();
async function loadJson(file: string, signal: AbortSignal, refresh: boolean): Promise<unknown> {
  const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
  const response = await fetch(`${base}/data/places/${file}`, {
    signal, ...(refresh ? { cache: "reload" as const } : {})
  });
  if (!response.ok) throw new Error(`Could not load ${file}`);
  return response.json();
}
export function useContextOverlay(category: ContextCategory, enabled: boolean, bounds?: MapBounds, zoom = 0): ContextState {
  const [state, setState] = useState<Omit<ContextState, "retry" | "zoomRequired">>({ loading: false, error: false });
  const [attempt, setAttempt] = useState(0);
  const lastAttempt = useRef(0);
  const zoomRequired = zoom < CONTEXT_OVERLAY_INFO[category].minZoom;
  useEffect(() => {
    if (!enabled) return;
    if (zoomRequired || !bounds) {
      setState(previous => ({ index: previous.index, loading: false, error: false }));
      return;
    }
    const controller = new AbortController();
    const area = bounds;
    const refresh = attempt !== lastAttempt.current;
    lastAttempt.current = attempt;
    setState(previous => ({ ...previous, loading: true, error: false }));
    async function load() {
      const index = !refresh && indexes.get(category) ||
        parseContextIndex(await loadJson(`${category}.json`, controller.signal, refresh), category);
      const wanted = index.tiles.filter(tile => contextTileIntersects(tile, area));
      const loaded = await Promise.all(wanted.map(async tile => {
        const cached = !refresh && tiles.get(tile.file);
        const data = cached || parseContextTile(await loadJson(tile.file, controller.signal, refresh), category, tile);
        if (!controller.signal.aborted) {
          tiles.delete(tile.file);
          tiles.set(tile.file, data);
          const oldest = tiles.keys().next().value;
          if (tiles.size > 32 && oldest !== undefined) tiles.delete(oldest);
        }
        return data.features;
      }));
      if (!controller.signal.aborted) {
        indexes.set(category, index);
        setState({ index, snapshot: { type: "FeatureCollection", category, features: loaded.flat() },
          loading: false, error: false });
      }
    }
    load().catch(() => {
      if (!controller.signal.aborted) setState(previous => ({ ...previous, loading: false, error: true }));
    });
    return () => controller.abort();
  }, [category, enabled, bounds, zoomRequired, attempt]);
  return { ...state, zoomRequired, retry: () => setAttempt(value => value + 1) };
}
