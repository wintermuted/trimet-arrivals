import { Map as MapboxMap } from "mapbox-gl";
import { useEffect, useRef } from "react";
import { VehiclePosition } from "../../../api/trimet/interfaces/vehicles";
import { createVehicleLayer, VehicleFollowView } from "../util/mapbox/vehicleLayer";

export default function NearbyVehicles({ map, vehicles, onError, onFollow, following, followView }: {
  map: MapboxMap;
  vehicles: VehiclePosition[];
  onError: (failed: boolean) => void;
  onFollow: (vehicle: VehiclePosition) => void;
  following?: Pick<VehiclePosition, "id" | "tripId">;
  followView: VehicleFollowView;
}) {
  const layer = useRef<ReturnType<typeof createVehicleLayer>>();
  useEffect(() => {
    layer.current = createVehicleLayer(map, onError, onFollow);
    return () => { layer.current?.dispose(); layer.current = undefined; };
  }, [map, onError, onFollow]);
  useEffect(() => { layer.current?.update(vehicles); }, [vehicles]);
  useEffect(() => { layer.current?.follow(following, followView); }, [following, followView]);
  return null;
}
