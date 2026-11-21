import { useVehicleTrip as useTrip } from "@trimet-arrivals/trimet-client/react";
import { getVehicleTrip } from "../../../api/trimet/vehicleTrip";

export function useVehicleTrip(blockId: string, tripId: string, updatedAt: number | undefined, enabled: boolean) {
  return useTrip(blockId, tripId, updatedAt, enabled, getVehicleTrip);
}
