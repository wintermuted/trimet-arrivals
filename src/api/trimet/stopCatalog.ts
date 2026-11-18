import { getAllRoutes } from "./routeConfig";
import { ROUTE_DISPLAY } from "./constants";
import { PlannerRouteColors } from "./plannerRouteColors";
import {
  RouteDataResultSet,
  RouteDirectionStop,
  TrimetRoute,
} from "./interfaces/routes";

export interface StopCatalogStop extends RouteDirectionStop {
  aliases: string[];
}

export interface StopCatalog {
  stops: StopCatalogStop[];
  routeCount: number;
  directionCount: number;
  stopReferenceCount: number;
  incompleteRouteCount: number;
  incompleteDirectionCount: number;
  incompleteRouteNames: string[];
  invalidStopCount: number;
  receivedAt?: string;
  plannerRouteColors?: PlannerRouteColors;
}

let catalogRequest: Promise<StopCatalog> | undefined;

function routeName(route: TrimetRoute): string {
  return `${route.desc || "Unknown route"} (${route.route})`;
}

export function buildStopCatalog(data: RouteDataResultSet): StopCatalog {
  if (!data || data.errorMessage) {
    throw new Error(data?.errorMessage || "TriMet returned no route data");
  }
  if (!Array.isArray(data.route) || data.route.length === 0) {
    throw new Error("TriMet returned no route configuration");
  }

  const stopsById = new Map<number, StopCatalogStop>();
  const plannerRouteColors = new Map<number, string>();
  const incompleteRoutes = new Set<string>();
  let directionCount = 0;
  let stopReferenceCount = 0;
  let incompleteRouteCount = 0;
  let incompleteDirectionCount = 0;
  let invalidStopCount = 0;

  data.route.forEach((route) => {
    if (route && ((route.type === "R" && Boolean(ROUTE_DISPLAY[route.route])) ||
        /^FX\s*\d+\b/i.test(route.desc))) {
      const hex = route.routeColor?.replace(/^#/, "");
      if (hex && /^[\da-f]{6}$/i.test(hex)) plannerRouteColors.set(route.route, `#${hex}`);
    }
    if (!route || !Array.isArray(route.dir)) {
      incompleteRouteCount += 1;
      if (route) {
        incompleteRoutes.add(routeName(route));
      }
      return;
    }

    route.dir.forEach((direction) => {
      directionCount += 1;
      if (!direction || !Array.isArray(direction.stop)) {
        incompleteDirectionCount += 1;
        incompleteRoutes.add(routeName(route));
        return;
      }

      direction.stop.forEach((stop) => {
        if (
          !stop ||
          !Number.isSafeInteger(stop.locid) ||
          stop.locid <= 0 ||
          typeof stop.desc !== "string" ||
          !stop.desc.trim() ||
          !Number.isFinite(stop.lat) ||
          !Number.isFinite(stop.lng)
        ) {
          invalidStopCount += 1;
          return;
        }

        stopReferenceCount += 1;
        const existing = stopsById.get(stop.locid);
        if (existing) {
          if (
            stop.desc !== existing.desc &&
            !existing.aliases.includes(stop.desc)
          ) {
            existing.aliases.push(stop.desc);
          }
          return;
        }

        stopsById.set(stop.locid, { ...stop, aliases: [] });
      });
    });
  });

  const stops = Array.from(stopsById.values()).sort(
    (a, b) =>
      a.desc.toLowerCase().localeCompare(b.desc.toLowerCase()) ||
      a.locid - b.locid,
  );

  return {
    stops,
    plannerRouteColors,
    routeCount: data.route.length,
    directionCount,
    stopReferenceCount,
    incompleteRouteCount,
    incompleteDirectionCount,
    incompleteRouteNames: Array.from(incompleteRoutes).sort(),
    invalidStopCount,
  };
}

export function searchStopCatalog(
  stops: StopCatalogStop[],
  search: string,
): StopCatalogStop[] {
  const query = search.trim().toLowerCase();
  if (!query) {
    return [];
  }

  return stops.filter(
    (stop) =>
      stop.locid.toString().includes(query) ||
      stop.desc.toLowerCase().includes(query) ||
      stop.aliases.some((alias) => alias.toLowerCase().includes(query)),
  );
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
