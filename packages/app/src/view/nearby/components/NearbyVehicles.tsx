import { Map as MapboxMap } from "mapbox-gl";
import React, { useEffect, useRef, useState } from "react";
import { Button, Select } from "@wintermuted/ui-theme/react";
import { ROUTE_DISPLAY } from "../../../api/trimet/constants";
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
  const layer = useRef<ReturnType<typeof createVehicleLayer>>(undefined);
  const [selectedId, setSelectedId] = useState("");
  const selectedIsAvailable = vehicles.some(vehicle => vehicle.id === selectedId);
  useEffect(() => {
    layer.current = createVehicleLayer(map, onError, onFollow);
    return () => { layer.current?.dispose(); layer.current = undefined; };
  }, [map, onError, onFollow]);
  useEffect(() => { layer.current?.update(vehicles); }, [vehicles]);
  useEffect(() => { layer.current?.follow(following, followView); }, [following, followView]);
  return (
    <div className="transit-vehicle-picker">
      <Select aria-label="Vehicle" value={selectedIsAvailable ? selectedId : ""}
        onChange={event => setSelectedId(event.target.value)} disabled={!vehicles.length}>
        <option value="">Choose a vehicle</option>
        {vehicles.map(vehicle => {
          const route = vehicle.routeNumber && (ROUTE_DISPLAY[vehicle.routeNumber] || `Route ${vehicle.routeNumber}`);
          return <option key={vehicle.id} value={vehicle.id}>
            {[route, `${vehicle.type === "bus" ? "Bus" : "Train"} ${vehicle.id}`, vehicle.destination].filter(Boolean).join(" — ")}
          </option>;
        })}
      </Select>
      <Button type="button" variant="secondary" size="sm" disabled={!selectedIsAvailable}
        onClick={event => layer.current?.openDetails(selectedId, event.currentTarget)}>
        Vehicle details
      </Button>
    </div>
  );
}
