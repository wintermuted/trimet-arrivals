import { planTrip as requestTrip } from "@overworld/trimet-client";
import type { TripPlannerOptions } from "@overworld/trimet-client";
import { API_ID, BASE_URL } from "./constants";

export { parsePlannerCoordinates, parseTripPlannerResponse } from "@overworld/trimet-client";
export type {
  TripPlannerItinerary,
  TripPlannerLeg,
  TripPlannerLocation,
  TripPlannerOptions,
  TripPlannerResponse,
  TripPlannerRoute
} from "@overworld/trimet-client";

export function planTrip(options: TripPlannerOptions) {
  return requestTrip(options, { baseUrl: BASE_URL, appId: API_ID });
}
