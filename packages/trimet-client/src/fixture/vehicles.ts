import type { VehicleBounds, VehiclePosition, VehicleSnapshot } from "../interfaces/vehicles";

export function vehicleFixtureData([west, south, east, north]: VehicleBounds): VehicleSnapshot {
  const now = Date.now();
  const offset = Math.sin(now / 15000) * 0.0008;
  const vehicles: VehiclePosition[] = [
    { id: "fixture-bus", type: "bus", routeNumber: 15, direction: 1, tripId: "example-bus-trip", blockId: "example-bus-block", longitude: -122.6784 + offset, latitude: 45.5152, bearing: 90, destination: "Example bus", time: now, expires: now + 60000 },
    { id: "fixture-rail", type: "rail", routeNumber: 100, direction: 0, tripId: "example-rail-trip", blockId: "example-rail-block", longitude: -122.676, latitude: 45.518 + offset, bearing: 0, color: "#1359AE", destination: "Example train", time: now, expires: now + 60000 },
  ];
  return {
    queryTime: now,
    vehicles: vehicles.filter(vehicle => vehicle.longitude >= west && vehicle.longitude <= east &&
      vehicle.latitude >= south && vehicle.latitude <= north),
    rejected: 0,
  };
}
