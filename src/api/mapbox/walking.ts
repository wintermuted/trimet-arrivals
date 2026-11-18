import { Feature, LineString } from "geojson";

export interface WalkingStop {
  locid: number;
  lat: number;
  lng: number;
}

export type WalkingEstimate =
  | { status: "ready"; meters: number; seconds: number }
  | { status: "unreachable" | "uncertain" };

export type WalkingRoute =
  | {
      status: "ready";
      meters: number;
      seconds: number;
      feature: Feature<LineString>;
    }
  | { status: "unreachable" | "uncertain" };

interface Waypoint {
  distance: number;
  location: number[];
}

interface MatrixResponse {
  code: string;
  distances?: Array<Array<number | null>>;
  durations?: Array<Array<number | null>>;
  sources?: Waypoint[];
  destinations?: Waypoint[];
}

interface DirectionsResponse {
  code: string;
  routes?: Array<{ distance: number; duration: number; geometry: LineString }>;
  waypoints?: Waypoint[];
}

interface CacheEntry<T> {
  expires: number;
  value: T;
}

const CACHE_MS = 60000;
const MAX_SNAP_METERS = 50;
const estimateCache = new Map<string, CacheEntry<WalkingEstimate>>();
const routeCache = new Map<string, CacheEntry<WalkingRoute>>();
let accessToken = "";

export function setWalkingAccessToken(token: string) {
  accessToken = token;
  clearWalkingCache();
}

export function clearWalkingCache() {
  estimateCache.clear();
  routeCache.clear();
}

function readCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string
): T | undefined {
  const entry = cache.get(key);
  if (entry?.expires > Date.now()) return entry.value;
  cache.delete(key);
  return undefined;
}

function remember<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T) {
  cache.set(key, { expires: Date.now() + CACHE_MS, value });
  if (cache.size > 256) cache.delete(cache.keys().next().value);
}

function checkCancelled(signal: AbortSignal) {
  if (signal.aborted)
    throw new DOMException("Walking request cancelled", "AbortError");
}

function validCoordinates(point: number[]): boolean {
  return (
    Array.isArray(point) &&
    point.length === 2 &&
    point.every(Number.isFinite) &&
    Math.abs(point[0]) <= 180 &&
    Math.abs(point[1]) <= 90
  );
}

function validateInput(origin: number[], stop: WalkingStop) {
  if (
    !validCoordinates(origin) ||
    !validCoordinates([stop.lng, stop.lat]) ||
    !Number.isSafeInteger(stop.locid) ||
    stop.locid <= 0
  ) {
    throw new Error(
      "Walking estimates require valid current-location and stop coordinates."
    );
  }
}

function validWaypoint(point: Waypoint): boolean {
  return (
    !!point &&
    validCoordinates(point.location) &&
    Number.isFinite(point.distance) &&
    point.distance >= 0
  );
}

function validMetric(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

async function request<T>(
  endpoint: "directions-matrix/v1" | "directions/v5",
  coordinates: number[][],
  parameters: Record<string, string>,
  signal: AbortSignal
): Promise<T> {
  checkCancelled(signal);
  const token = accessToken;
  if (!token) throw new Error("Mapbox walking routing is not configured.");
  const query = new URLSearchParams({ ...parameters, access_token: token });
  const points = coordinates.map((point) => point.join(",")).join(";");
  let response: Response;
  try {
    response = await fetch(
      `https://api.mapbox.com/${endpoint}/mapbox/walking/${points}?${query}`,
      { cache: "no-store", signal }
    );
  } catch {
    checkCancelled(signal);
    throw new Error(
      "Could not reach Mapbox walking routing. Check your connection and retry."
    );
  }
  checkCancelled(signal);
  if (response.status === 429) {
    throw new Error(
      "Mapbox walking request limit reached. Wait before retrying."
    );
  }
  if (!response.ok) {
    throw new Error(
      `Walking routing failed (HTTP ${response.status}). Check Mapbox routing access and token restrictions.`
    );
  }
  let result: T;
  try {
    result = await response.json();
  } catch {
    checkCancelled(signal);
    throw new Error("Mapbox returned unreadable walking routing data.");
  }
  checkCancelled(signal);
  return result;
}

function stopKey(origin: number[], stop: WalkingStop) {
  return JSON.stringify([origin, stop.locid, stop.lng, stop.lat]);
}

export async function getWalkingRoute(
  origin: number[],
  stop: WalkingStop,
  signal: AbortSignal
): Promise<WalkingRoute> {
  validateInput(origin, stop);
  return requestWalkingPath(origin, [stop.lng, stop.lat], stopKey(origin, stop), signal);
}

export async function getWalkingPath(
  origin: number[],
  destination: number[],
  signal: AbortSignal
): Promise<WalkingRoute> {
  if (!validCoordinates(origin) || !validCoordinates(destination)) {
    throw new Error("Walking paths require valid endpoint coordinates.");
  }
  return requestWalkingPath(origin, destination, JSON.stringify([origin, destination]), signal);
}

async function requestWalkingPath(
  origin: number[],
  destination: number[],
  key: string,
  signal: AbortSignal
): Promise<WalkingRoute> {
  checkCancelled(signal);
  const cached = readCache(routeCache, key);
  if (cached) return cached;
  const data = await request<DirectionsResponse>(
    "directions/v5",
    [origin, destination],
    {
      geometries: "geojson",
      overview: "full",
    },
    signal
  );
  let result: WalkingRoute;
  if (data?.code === "NoRoute") {
    result = { status: "unreachable" };
  } else if (data?.code === "NoSegment") {
    result = { status: "uncertain" };
  } else {
    const route = data?.routes?.[0];
    if (
      data?.code !== "Ok" ||
      !route ||
      !validMetric(route.distance) ||
      !validMetric(route.duration) ||
      route.geometry?.type !== "LineString" ||
      !Array.isArray(route.geometry.coordinates) ||
      route.geometry.coordinates.length < 2 ||
      !route.geometry.coordinates.every(validCoordinates) ||
      data.waypoints?.length !== 2 ||
      !data.waypoints.every(validWaypoint)
    ) {
      throw new Error("Mapbox returned an invalid walking route.");
    }
    result = data.waypoints.some((point) => point.distance > MAX_SNAP_METERS)
      ? { status: "uncertain" }
      : {
          feature: {
            geometry: route.geometry,
            properties: {},
            type: "Feature",
          },
          meters: route.distance,
          seconds: route.duration,
          status: "ready",
        };
  }
  remember(routeCache, key, result);
  return result;
}

export async function getWalkingEstimates(
  origin: number[],
  stops: WalkingStop[],
  signal: AbortSignal
): Promise<Map<number, WalkingEstimate>> {
  const unique = Array.from(
    new Map(stops.map((stop) => [stop.locid, stop])).values()
  ).sort((a, b) => a.locid - b.locid);
  unique.forEach((stop) => validateInput(origin, stop));
  checkCancelled(signal);
  const estimates = new Map<number, WalkingEstimate>();
  const pending = unique.filter((stop) => {
    const cached = readCache(estimateCache, stopKey(origin, stop));
    if (!cached) return true;
    estimates.set(stop.locid, cached);
    return false;
  });
  for (let offset = 0; offset < pending.length; offset += 24) {
    checkCancelled(signal);
    const batch = pending.slice(offset, offset + 24);
    if (batch.length === 1) {
      const result = await getWalkingRoute(origin, batch[0], signal);
      const estimate: WalkingEstimate =
        result.status === "ready"
          ? { meters: result.meters, seconds: result.seconds, status: "ready" }
          : { status: result.status };
      estimates.set(batch[0].locid, estimate);
      remember(estimateCache, stopKey(origin, batch[0]), estimate);
      continue;
    }
    const data = await request<MatrixResponse>(
      "directions-matrix/v1",
      [origin, ...batch.map((stop) => [stop.lng, stop.lat])],
      {
        annotations: "distance,duration",
        destinations: batch.map((_, index) => String(index + 1)).join(";"),
        sources: "0",
      },
      signal
    );
    if (
      data?.code !== "Ok" ||
      data.distances?.length !== 1 ||
      data.durations?.length !== 1 ||
      !Array.isArray(data.distances[0]) ||
      !Array.isArray(data.durations[0]) ||
      data.distances[0].length !== batch.length ||
      data.durations[0].length !== batch.length ||
      data.sources?.length !== 1 ||
      !data.sources.every(validWaypoint) ||
      data.destinations?.length !== batch.length ||
      !data.destinations.every(validWaypoint)
    ) {
      if (data?.code === "NoRoute" || data?.code === "NoSegment") {
        batch.forEach((stop) =>
          estimates.set(stop.locid, {
            status: data.code === "NoRoute" ? "unreachable" : "uncertain",
          })
        );
        continue;
      }
      throw new Error("Mapbox returned invalid walking estimates.");
    }
    batch.forEach((stop, index) => {
      const meters = data.distances[0][index];
      const seconds = data.durations[0][index];
      let estimate: WalkingEstimate;
      if (meters === null && seconds === null) {
        estimate = { status: "unreachable" };
      } else if (!validMetric(meters) || !validMetric(seconds)) {
        throw new Error(
          "Mapbox returned an invalid walking distance or duration."
        );
      } else if (
        data.sources[0].distance > MAX_SNAP_METERS ||
        data.destinations[index].distance > MAX_SNAP_METERS
      ) {
        estimate = { status: "uncertain" };
      } else {
        estimate = { meters, seconds, status: "ready" };
      }
      estimates.set(stop.locid, estimate);
      remember(estimateCache, stopKey(origin, stop), estimate);
    });
  }
  return estimates;
}
