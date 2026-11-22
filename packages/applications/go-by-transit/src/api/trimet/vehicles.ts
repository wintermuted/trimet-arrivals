import { getVehicles as requestVehicles } from "@overworld/trimet-client";
import type { VehicleBounds } from "@overworld/trimet-client";
import { fixtureEnabled } from "../util";
import { API_ID, BASE_URL } from "./constants";

export { VehicleRequestError } from "@overworld/trimet-client";

export function getVehicles(bounds: VehicleBounds | undefined, signal?: AbortSignal, vehicleId?: string) {
  return requestVehicles(bounds, {
    baseUrl: BASE_URL,
    appId: API_ID,
    useFixtures: fixtureEnabled() === true
  }, signal, vehicleId);
}
