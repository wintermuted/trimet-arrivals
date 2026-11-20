import { planTrip as requestTrip } from "@trimet-arrivals/trimet-client";
import type { TripPlannerOptions } from "@trimet-arrivals/trimet-client";
import { API_ID, BASE_URL } from "./constants";

export { parsePlannerCoordinates, parseTripPlannerResponse } from "@trimet-arrivals/trimet-client";
export type {
  TripPlannerItinerary,
  TripPlannerLeg,
  TripPlannerLocation,
  TripPlannerOptions,
  TripPlannerResponse,
  TripPlannerRoute
} from "@trimet-arrivals/trimet-client";

export function planTrip(options: TripPlannerOptions) {
  return requestTrip(options, { baseUrl: BASE_URL, appId: API_ID });
}
