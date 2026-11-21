import type { Feature, LineString, MultiLineString } from "geojson";
import type { RouteDataResultSet } from "@trimet-arrivals/trimet-client";

export type RouteGeometryLoader = (
  routeId: string, direction: number, signal?: AbortSignal
) => Promise<Feature<LineString | MultiLineString>>;

export type NearbyRouteDirections = Record<number, { directions: readonly number[] }>;

export interface VehicleRouteDetails {
  routeDisplay: Readonly<Record<number, string>>;
  getRouteById(routeId: number, signal?: AbortSignal): Promise<RouteDataResultSet>;
}
