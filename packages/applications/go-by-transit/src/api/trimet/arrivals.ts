import { getArrivals as requestArrivals } from "@overworld/trimet-client";
import { fixtureEnabled } from "../util";
import { API_ID, BASE_URL } from "./constants";

export function getArrivals(stopLocationIds: string, minutes: number) {
  return requestArrivals(stopLocationIds, minutes, {
    baseUrl: BASE_URL,
    appId: API_ID,
    useFixtures: fixtureEnabled() === true
  });
}
