import type React from "react";
import type { PlannerEndpoint } from "@overworld/journeys";
import type { InterestPlace } from "@overworld/places/catalog";
import type { PlannerRouteColors } from "../../api/trimet/plannerRouteColors";
import type { StopCatalogStop } from "../../api/trimet/stopCatalog";
import type { TripPlannerItinerary, TripPlannerResponse } from "../../api/trimet/tripplanner";
import type { SavedPlannerStop } from "./PlannerStopSelect";

export const EMPTY_STOPS: StopCatalogStop[] = [];

export type TripState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" | "empty" };

export type PlannedSearch = {
  from: PlannerEndpoint;
  to: PlannerEndpoint;
  response: TripPlannerResponse;
};

export const coordinateHelp = "Enter longitude, latitude (for example -122.68, 45.52).";

export interface TripPlannerProps {
  inSidebar?: boolean;
  directionsFooter?: HTMLDivElement;
  savedStops?: SavedPlannerStop[];
  renderPlaceDestination?: (place?: InterestPlace) => React.ReactNode;
  renderMapStatus?: (
    itineraries: TripPlannerItinerary[],
    selected: number,
    highlightedLeg: number | undefined,
    onMapLeg: (leg?: number) => void,
    routeColors?: PlannerRouteColors,
    previewTrip?: number
  ) => React.ReactNode;
}

