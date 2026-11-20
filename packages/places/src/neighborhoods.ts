import { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { useEffect, useState } from "react";
import { PlaceSnapshot, safePlaceUrl, validPlacePoint } from "./places";

export type NeighborhoodSnapshot = FeatureCollection<Polygon | MultiPolygon, { name: string; shared: boolean; areaId: number }> &
  Pick<PlaceSnapshot, "version" | "retrievedAt" | "source" | "sourceUrl" | "license" | "licenseUrl" | "coverage">;
export interface NeighborhoodState {
  snapshot?: NeighborhoodSnapshot;
  loading: boolean;
  error: boolean;
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
function validPolygon(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.every(ring =>
    Array.isArray(ring) && ring.length >= 4 && ring.every(validPlacePoint) &&
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]);
}
function validGeometry(value: unknown): boolean {
  return record(value) && (value.type === "Polygon" ? validPolygon(value.coordinates) :
    value.type === "MultiPolygon" && Array.isArray(value.coordinates) &&
      value.coordinates.length > 0 && value.coordinates.every(validPolygon));
}
export function parseNeighborhoodSnapshot(value: unknown): NeighborhoodSnapshot {
  if (!record(value) || value.type !== "FeatureCollection" || value.version !== 1 ||
      typeof value.retrievedAt !== "string" || !Number.isFinite(Date.parse(value.retrievedAt)) ||
      typeof value.source !== "string" || !safePlaceUrl(value.sourceUrl) ||
      typeof value.license !== "string" || !safePlaceUrl(value.licenseUrl) || typeof value.coverage !== "string" ||
      !Array.isArray(value.features) || !value.features.length ||
      !value.features.every(feature => record(feature) && feature.type === "Feature" &&
        record(feature.properties) && typeof feature.properties.name === "string" && feature.properties.name.trim() &&
        Number.isInteger(feature.properties.areaId) && Number(feature.properties.areaId) >= 0 &&
        feature.id === `portland:neighborhood:${feature.properties.areaId}` &&
        typeof feature.properties.shared === "boolean" && validGeometry(feature.geometry)) ||
      new Set(value.features.map(feature => feature.id)).size !== value.features.length) {
    throw new Error("Invalid Portland neighborhood snapshot");
  }
  return {
    type: "FeatureCollection", version: 1, retrievedAt: value.retrievedAt,
    source: value.source, sourceUrl: value.sourceUrl, license: value.license,
    licenseUrl: value.licenseUrl, coverage: value.coverage,
    features: value.features as NeighborhoodSnapshot["features"]
  };
}

let cache: NeighborhoodSnapshot | undefined;
export function useNeighborhoods(enabled: boolean) {
  const [state, setState] = useState<NeighborhoodState>({ loading: false, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: false }));
    async function load() {
      if (cache && attempt === 0) return cache;
      const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
      const response = await fetch(`${base}/data/places/neighborhoods.json`, {
        signal: controller.signal, ...(attempt > 0 ? { cache: "reload" as const } : {})
      });
      if (!response.ok) throw new Error("Could not load Portland neighborhoods");
      return parseNeighborhoodSnapshot(await response.json());
    }
    load().then(snapshot => {
      if (!controller.signal.aborted) {
        cache = snapshot;
        setState({ snapshot, loading: false, error: false });
      }
    }).catch(() => {
      if (!controller.signal.aborted) setState(previous => ({ ...previous, loading: false, error: true }));
    });
    return () => controller.abort();
  }, [enabled, attempt]);
  return { ...state, retry: () => setAttempt(value => value + 1) };
}
