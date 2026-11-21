import { getVehicleTrip as requestVehicleTrip } from "@trimet-arrivals/trimet-client";
import { fixtureEnabled } from "../util";
import { API_ID, BASE_URL } from "./constants";

export type { VehicleTrip, VehicleTripSnapshot, VehicleTripStop } from "@trimet-arrivals/trimet-client";

export function getVehicleTrip(blockId: string, tripId: string, signal?: AbortSignal) {
  return requestVehicleTrip(blockId, tripId, {
    baseUrl: BASE_URL,
    appId: API_ID,
    useFixtures: fixtureEnabled() === true
  }, signal);
}
