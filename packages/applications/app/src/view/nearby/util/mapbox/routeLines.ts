import type { Map } from "mapbox-gl";
import { getRouteGeometry as loadGeometry } from "@trimet-arrivals/routing";
import { setRoutes as installRoutes, showNearbyRouteLines as showLines } from "@trimet-arrivals/maps/transit";
import type { NearbyRouteDirections } from "@trimet-arrivals/maps/transit";

export { addMapboxLayer, removeRoutes, NEARBY_ROUTE_LINES } from "@trimet-arrivals/maps/transit";

export function getRouteGeometry(routeId: string, directionId: number, signal?: AbortSignal) {
  return loadGeometry(routeId, directionId, { baseUrl: process.env.PUBLIC_URL || "", signal });
}

export function showNearbyRouteLines(map: Map, routes: NearbyRouteDirections) {
  return showLines(map, routes, getRouteGeometry);
}

export function setRoutes(map: Map, routes: NearbyRouteDirections) {
  return installRoutes(map, routes, getRouteGeometry);
}
