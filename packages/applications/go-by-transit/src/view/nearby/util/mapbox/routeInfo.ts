import type { Map } from "mapbox-gl";
import type { RouteConfigRoute } from "@overworld/trimet-client";
import { showRouteInfo as showInfo } from "@overworld/maps/transit";
import { getRouteGeometry } from "./routeLines";

export { highlightRouteInfoStop } from "@overworld/maps/transit";

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
