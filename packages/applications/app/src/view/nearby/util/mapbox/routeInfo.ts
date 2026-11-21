import type { Map } from "mapbox-gl";
import type { RouteConfigRoute } from "@trimet-arrivals/trimet-client";
import { showRouteInfo as showInfo } from "@trimet-arrivals/maps/transit";
import { getRouteGeometry } from "./routeLines";

export { highlightRouteInfoStop } from "@trimet-arrivals/maps/transit";

export function showRouteInfo(
  map: Map,
  route: RouteConfigRoute,
  onError: () => void,
  onStopClick?: (stopId: number) => void,
  canFit = () => true,
  isActive = () => true
) {
  return showInfo(map, route, onError, getRouteGeometry, onStopClick, canFit, isActive);
}
