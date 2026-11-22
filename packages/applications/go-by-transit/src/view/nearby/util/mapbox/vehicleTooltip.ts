import type { Map } from "mapbox-gl";
import type { VehiclePosition } from "@overworld/trimet-client";
import { createVehicleTooltips as createTooltips } from "@overworld/maps/transit";
import { ROUTE_DISPLAY } from "../../../../api/trimet/constants";
import { getRouteById } from "../../../../api/trimet/routeConfig";

export function createVehicleTooltips(
  map: Map,
  layer: string,
  find: (id: string) => { vehicle: VehiclePosition; point: [number, number] } | undefined,
  onFollow: (vehicle: VehiclePosition) => void
) {
  return createTooltips(map, layer, find, onFollow, { routeDisplay: ROUTE_DISPLAY, getRouteById });
}
