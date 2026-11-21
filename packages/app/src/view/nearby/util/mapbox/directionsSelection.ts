import type { Map } from "mapbox-gl";
import { showDirectionsSelection as showSelection } from "@trimet-arrivals/maps/transit";
import type { DirectionsSelection } from "@trimet-arrivals/maps/transit";
import { getRouteGeometry } from "./routeLines";

export type { DirectionsSelection } from "@trimet-arrivals/maps/transit";
export { highlightDirectionsStop } from "@trimet-arrivals/maps/transit";

export function showDirectionsSelection(map: Map, selection: DirectionsSelection, onError: () => void) {
  return showSelection(map, selection, onError, getRouteGeometry);
}
