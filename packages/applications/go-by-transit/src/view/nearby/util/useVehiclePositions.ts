import { useMemo } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { useVehiclePositions as usePositions } from "@overworld/trimet-client/react";
import type { VehicleViewport } from "@overworld/trimet-client/react";
import type { VehicleBounds } from "@overworld/trimet-client";
import { getVehicles } from "../../../api/trimet/vehicles";

export type { VehicleFeed } from "@overworld/trimet-client/react";

function viewportBounds(map: MapboxMap): VehicleBounds {
  const bounds = map.getBounds();
  const wrap = (longitude: number) => ((longitude + 180) % 360 + 360) % 360 - 180;
  const west = wrap(bounds.getWest());
  const east = wrap(bounds.getEast());
  const wholeWorld = bounds.getEast() - bounds.getWest() >= 360 || west > east;
  return [
    wholeWorld ? -180 : west, Math.max(-90, bounds.getSouth()),
    wholeWorld ? 180 : east, Math.min(90, bounds.getNorth()),
  ];
}

export function useVehiclePositions(map: MapboxMap | undefined, enabled: boolean, vehicleId?: string) {
  const viewport = useMemo<VehicleViewport | undefined>(() => map && ({
    getBounds: () => viewportBounds(map),
    subscribeMove(listener) {
      map.on("moveend", listener);
      return () => { map.off("moveend", listener); };
    },
    subscribeRemove(listener) {
      map.on("remove", listener);
      return () => { map.off("remove", listener); };
    }
  }), [map]);
  return usePositions(viewport, enabled, getVehicles, vehicleId);
}
