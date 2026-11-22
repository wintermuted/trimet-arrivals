import type { Map } from "mapbox-gl";
import { showDirectionsSelection as showSelection } from "@overworld/maps/transit";
import type { DirectionsSelection } from "@overworld/maps/transit";
import { getRouteGeometry } from "./routeLines";

export type { DirectionsSelection } from "@overworld/maps/transit";
export { highlightDirectionsStop } from "@overworld/maps/transit";

export function showDirectionsSelection(map: Map, selection: DirectionsSelection, onError: () => void) {
  return showSelection(map, selection, onError, getRouteGeometry);
}
