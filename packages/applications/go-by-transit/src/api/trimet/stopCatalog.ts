import { buildStopCatalog as indexStops, normalizeRouteColor } from "@overworld/trimet-client";
import type { StopCatalog as IndexedStopCatalog } from "@overworld/trimet-client";
import { ROUTE_DISPLAY } from "./constants";
import type { RouteDataResultSet } from "./interfaces/routes";
import { PLANNER_BUS_COLOR } from "./plannerRouteColors";
import type { PlannerRouteColors } from "./plannerRouteColors";
import { getAllRoutes } from "./routeConfig";

export { searchStopCatalog, stopMode } from "@overworld/trimet-client";
export type { StopCatalogStop, StopMode } from "@overworld/trimet-client";

export interface StopCatalog extends IndexedStopCatalog {
  receivedAt?: string;
  plannerRouteColors?: PlannerRouteColors;
}

let catalogRequest: Promise<StopCatalog> | undefined;

export function buildStopCatalog(data: RouteDataResultSet): StopCatalog {
  const plannerRouteColors = new Map<number, string>();
  const catalog = indexStops(data, (route, mode) => {
    if (mode === "Streetcar" ||
        (mode === "Rail" && (route.route === 203 || Boolean(ROUTE_DISPLAY[route.route]))) ||
        /^\s*FX\s*\d+\b/i.test(route.desc)) {
      const color = normalizeRouteColor(route.routeColor);
      if (color) {
        plannerRouteColors.set(route.route, color);
        return color;
      }
    }
    return mode === "Bus" ? PLANNER_BUS_COLOR : undefined;
  });
  return { ...catalog, plannerRouteColors };
}

export function getStopCatalog(forceRefresh = false): Promise<StopCatalog> {
  if (!forceRefresh && catalogRequest) {
    return catalogRequest;
  }

  const request = getAllRoutes().then((data) => ({
    ...buildStopCatalog(data),
    receivedAt: new Date().toISOString(),
  }));
  catalogRequest = request;
  request.catch(() => {
    if (catalogRequest === request) {
      catalogRequest = undefined;
    }
  });
  return request;
}
