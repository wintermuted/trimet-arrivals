import type { VehiclePosition } from "./interfaces/vehicles";

const MAX_AGE_MS = 90_000;

export function vehicleIsFresh(vehicle: Pick<VehiclePosition, "expires" | "time">, now: number): boolean {
  return vehicle.expires > now && now - vehicle.time < MAX_AGE_MS;
}

export function isVehicleTripStale(receivedAt: number | undefined, now: number): boolean {
  return !receivedAt || now - receivedAt >= MAX_AGE_MS;
}
