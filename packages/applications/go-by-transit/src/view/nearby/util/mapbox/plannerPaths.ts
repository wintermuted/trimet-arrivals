import { loadPlannerPaths as loadPaths } from "@overworld/routing";
import type { TripPlannerItinerary } from "@overworld/trimet-client";
import { getWalkingPath } from "../../../../api/mapbox/walking";
import { plannerRouteId, plannerTransitColor } from "../../../../api/trimet/plannerRouteColors";
import type { PlannerRouteColors } from "../../../../api/trimet/plannerRouteColors";
import { getRouteById } from "../../../../api/trimet/routeConfig";
import { getRouteGeometry } from "./routeLines";

export function loadPlannerPaths(
  itineraries: TripPlannerItinerary[],
  signal: AbortSignal,
  walkingEnabled: boolean,
  routeColors?: PlannerRouteColors
) {
  return loadPaths(itineraries, signal, walkingEnabled, {
    getRouteById,
    getRouteGeometry,
    getWalkingPath,
    routeId: plannerRouteId,
    transitColor: leg => plannerTransitColor(leg, routeColors)
  });
}
