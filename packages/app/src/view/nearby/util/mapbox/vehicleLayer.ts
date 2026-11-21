import type { Map } from "mapbox-gl";
import type { VehiclePosition } from "@trimet-arrivals/trimet-client";
import { createVehicleLayer as createLayer } from "@trimet-arrivals/maps/transit";
import { ROUTE_DISPLAY } from "../../../../api/trimet/constants";
import { createVehicleTooltips } from "./vehicleTooltip";

export type { VehicleFollowView } from "@trimet-arrivals/maps/transit";

export function createVehicleLayer(
  map: Map,
  onError: (failed: boolean) => void,
  onFollow: (vehicle: VehiclePosition) => void
) {
  return createLayer(map, onError, onFollow, { routeDisplay: ROUTE_DISPLAY, createTooltips: createVehicleTooltips });
}
