import { TripPlannerLeg } from "./tripplanner";

export type PlannerRouteColors = ReadonlyMap<number, string>;

export function plannerRouteId(leg: TripPlannerLeg): number {
  return leg.route?.internalNumber ?? Number(leg.route?.number);
}

export function plannerTransitColor(leg: TripPlannerLeg, colors?: PlannerRouteColors): string {
  return colors?.get(plannerRouteId(leg)) ?? "#1559d1";
}
