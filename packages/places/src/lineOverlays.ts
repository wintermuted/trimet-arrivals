import { FeatureCollection, LineString, MultiLineString } from "geojson";
import { useEffect, useState } from "react";
import { PlaceSnapshot, safePlaceUrl, validPlacePoint } from "./places";

export const LINE_OVERLAY_INFO = {
  "park-trails": { label: "Park trails", file: "park-trails.json", color: "#168461" },
  "bicycle-network": { label: "Bicycle network", file: "bicycle-network.json", color: "#3c7fd8" },
  "recommended-bike-routes": { label: "Recommended bike routes", file: "recommended-bike-routes.json", color: "#b77909" }
} as const;
export type LineOverlayCategory = keyof typeof LINE_OVERLAY_INFO;
export const LINE_OVERLAY_CATEGORIES = Object.keys(LINE_OVERLAY_INFO) as LineOverlayCategory[];
export const DEFAULT_LINE_OVERLAYS: Record<LineOverlayCategory, boolean> = {
  "park-trails": false, "bicycle-network": false, "recommended-bike-routes": false
};
export const LINE_CAUTION_COLOR = "#d44d4d";
export type LineOverlaySnapshot = FeatureCollection<LineString | MultiLineString,
  { name: string; kind: "standard" | "caution"; detail: string }> &
  Pick<PlaceSnapshot, "version" | "retrievedAt" | "source" | "sourceUrl" | "license" | "licenseUrl" | "coverage"> &
  { category: LineOverlayCategory };
export interface LineOverlayState {
  snapshot?: LineOverlaySnapshot;
  loading: boolean;
  error: boolean;
  retry: () => void;
}
export interface LineOverlayControls {
  shown: Record<LineOverlayCategory, boolean>;
  sources: Record<LineOverlayCategory, LineOverlayState>;
  mapErrors: Record<LineOverlayCategory, boolean>;
  onShown: (category: LineOverlayCategory, shown: boolean) => void;
  onRetry: (category: LineOverlayCategory) => void;
}
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const validLine = (value: unknown) => Array.isArray(value) && value.length >= 2 && value.every(validPlacePoint);
function validGeometry(value: unknown) {
  return record(value) && (value.type === "LineString" ? validLine(value.coordinates) :
    value.type === "MultiLineString" && Array.isArray(value.coordinates) &&
      value.coordinates.length > 0 && value.coordinates.every(validLine));
}
export function parseLineOverlaySnapshot(value: unknown, category: LineOverlayCategory): LineOverlaySnapshot {
  if (!record(value) || value.type !== "FeatureCollection" || value.version !== 1 || value.category !== category ||
      typeof value.retrievedAt !== "string" || !Number.isFinite(Date.parse(value.retrievedAt)) ||
      typeof value.source !== "string" || !safePlaceUrl(value.sourceUrl) ||
      typeof value.license !== "string" || !safePlaceUrl(value.licenseUrl) || typeof value.coverage !== "string" ||
      !Array.isArray(value.features) || !value.features.length ||
      !value.features.every(feature => record(feature) && feature.type === "Feature" &&
        typeof feature.id === "string" && new RegExp(`^portland:${category}:[1-9]\\d*$`).test(feature.id) &&
        record(feature.properties) && typeof feature.properties.name === "string" && Boolean(feature.properties.name.trim()) &&
        typeof feature.properties.detail === "string" &&
        (feature.properties.kind === "standard" || (category === "recommended-bike-routes" && feature.properties.kind === "caution")) &&
        validGeometry(feature.geometry)) ||
      new Set(value.features.map(feature => feature.id)).size !== value.features.length) {
    throw new Error(`Invalid ${category} line snapshot`);
  }
  return { type: "FeatureCollection", version: 1, category, retrievedAt: value.retrievedAt,
    source: value.source, sourceUrl: value.sourceUrl, license: value.license, licenseUrl: value.licenseUrl,
    coverage: value.coverage, features: value.features as LineOverlaySnapshot["features"] };
}

const cache = new Map<LineOverlayCategory, LineOverlaySnapshot>();
export function useLineOverlay(category: LineOverlayCategory, enabled: boolean): LineOverlayState {
  const [state, setState] = useState<Omit<LineOverlayState, "retry">>({ loading: false, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: false }));
    async function load() {
      const cached = cache.get(category);
      if (cached && attempt === 0) return cached;
      const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
      const response = await fetch(`${base}/data/places/${LINE_OVERLAY_INFO[category].file}`, {
        signal: controller.signal, ...(attempt > 0 ? { cache: "reload" as const } : {})
      });
      if (!response.ok) throw new Error(`Could not load ${LINE_OVERLAY_INFO[category].label}`);
      return parseLineOverlaySnapshot(await response.json(), category);
    }
    load().then(snapshot => {
      if (!controller.signal.aborted) {
        cache.set(category, snapshot);
        setState({ snapshot, loading: false, error: false });
      }
    }).catch(() => {
      if (!controller.signal.aborted) setState(previous => ({ ...previous, loading: false, error: true }));
    });
    return () => controller.abort();
  }, [category, enabled, attempt]);
  return { ...state, retry: () => setAttempt(value => value + 1) };
}
