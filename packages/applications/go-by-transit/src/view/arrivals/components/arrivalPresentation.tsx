import React from "react";
import type { TrimetRoute } from "../../../api/trimet/interfaces/types";
import RouteIndicator from "../../../component/route/RouteIndicator";
import { getDistanceUntilArrival } from "../util";

export const formatArrivalDistance = (feet: number) => `${Math.round(getDistanceUntilArrival(feet))} miles`;

export function renderArrivalRoute(routeId: number, route?: TrimetRoute) {
  return <RouteIndicator routeId={routeId} route={route} />;
}
