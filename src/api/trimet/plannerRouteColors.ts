import { TripPlannerLeg } from "./tripplanner";

export type PlannerRouteColors = ReadonlyMap<number, string>;
export const PLANNER_BUS_COLOR = "#1559d1";

export function plannerRouteId(leg: TripPlannerLeg): number {
  return leg.route?.internalNumber ?? Number(leg.route?.number);
}

export function plannerTransitColor(leg: TripPlannerLeg, colors?: PlannerRouteColors): string {
  return colors?.get(plannerRouteId(leg)) ?? PLANNER_BUS_COLOR;
}
