import { getNearbyStops as requestNearbyStops } from "@overworld/trimet-client";
import type { Location } from "@overworld/trimet-client";
import { fixtureEnabled } from "../util";
import { API_ID, BASE_URL } from "./constants";

export function getNearbyStops(location: Location, radiusInFeet: number) {
  return requestNearbyStops(location, radiusInFeet, {
    baseUrl: BASE_URL,
    appId: API_ID,
    useFixtures: fixtureEnabled() === true
  });
}
