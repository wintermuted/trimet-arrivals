import type { Map } from "mapbox-gl";
import { getRouteGeometry as loadGeometry } from "@overworld/routing";
import { setRoutes as installRoutes, showNearbyRouteLines as showLines } from "@overworld/maps/transit";
import type { NearbyRouteDirections } from "@overworld/maps/transit";

export { addMapboxLayer, removeRoutes, NEARBY_ROUTE_LINES } from "@overworld/maps/transit";

export function getRouteGeometry(routeId: string, directionId: number, signal?: AbortSignal) {
  return loadGeometry(routeId, directionId, { baseUrl: process.env.PUBLIC_URL || "", signal });
}

export function showNearbyRouteLines(map: Map, routes: NearbyRouteDirections) {
  return showLines(map, routes, getRouteGeometry);
}

export function setRoutes(map: Map, routes: NearbyRouteDirections) {
  return installRoutes(map, routes, getRouteGeometry);
}
