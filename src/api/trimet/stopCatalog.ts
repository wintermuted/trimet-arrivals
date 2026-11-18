import { getAllRoutes } from "./routeConfig";
import { ROUTE_DISPLAY } from "./constants";
import { PLANNER_BUS_COLOR, PlannerRouteColors } from "./plannerRouteColors";
import {
  RouteDataResultSet,
  RouteDirectionStop,
  TrimetRoute,
} from "./interfaces/routes";

const STOP_MODES = ["Bus", "Rail", "Streetcar", "Aerial tram"] as const;
export type StopMode = typeof STOP_MODES[number];

interface StopCatalogRoute {
  id: number;
  label: string;
  color?: string;
}

export interface StopCatalogStop extends RouteDirectionStop {
  aliases: string[];
  modes?: StopMode[];
  routes?: StopCatalogRoute[];
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

function stopMode(route: TrimetRoute): StopMode | undefined {
  if (route.type === "B") return "Bus";
  if (route.type === "S") return "Streetcar";
  if (route.type === "R") {
    if (route.route === 208) return "Aerial tram";
    if (/^Portland Streetcar\b/i.test(route.desc)) return "Streetcar";
    return "Rail";
  }
}

export function buildStopCatalog(data: RouteDataResultSet): StopCatalog {
  if (!data || data.errorMessage) {
    throw new Error(data?.errorMessage || "TriMet returned no route data");
  }
  if (!Array.isArray(data.route) || data.route.length === 0) {
    throw new Error("TriMet returned no route configuration");
  }

  const stopsById = new Map<number, StopCatalogStop & {
    modes: StopMode[];
    routesById: Map<number, StopCatalogRoute>;
  }>();
  const plannerRouteColors = new Map<number, string>();
  const incompleteRoutes = new Set<string>();
  let directionCount = 0;
  let stopReferenceCount = 0;
  let incompleteRouteCount = 0;
  let incompleteDirectionCount = 0;
  let invalidStopCount = 0;

  data.route.forEach((route) => {
    const mode = route && stopMode(route);
    let color = mode === "Bus" ? PLANNER_BUS_COLOR : undefined;
    if (route && (mode === "Streetcar" ||
        (mode === "Rail" && (route.route === 203 || Boolean(ROUTE_DISPLAY[route.route]))) ||
        /^\s*FX\s*\d+\b/i.test(route.desc))) {
      const hex = route.routeColor?.replace(/^#/, "");
      if (hex && /^[\da-f]{6}$/i.test(hex)) {
        color = `#${hex}`;
        plannerRouteColors.set(route.route, color);
      }
    }
    if (!route || !Array.isArray(route.dir)) {
      incompleteRouteCount += 1;
      if (route) {
        incompleteRoutes.add(routeName(route));
      }
      return;
    }

    const service = Number.isSafeInteger(route.route) && route.route > 0
      ? { id: route.route, label: route.desc?.trim() || `Route ${route.route}`, color }
      : undefined;
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
          if (mode && !existing.modes.includes(mode)) existing.modes.push(mode);
          if (service) existing.routesById.set(service.id, service);
          if (
            stop.desc !== existing.desc &&
            !existing.aliases.includes(stop.desc)
          ) {
            existing.aliases.push(stop.desc);
          }
          return;
        }

        stopsById.set(stop.locid, {
          ...stop,
          aliases: [],
          modes: mode ? [mode] : [],
          routesById: new Map(service ? [[service.id, service]] : []),
        });
      });
    });
  });

  const stops = Array.from(stopsById.values(), ({ modes, routesById, ...stop }) => ({
    ...stop,
    modes: modes.sort((a, b) => STOP_MODES.indexOf(a) - STOP_MODES.indexOf(b)),
    routes: Array.from(routesById.values()).sort((a, b) => a.id - b.id),
  })).sort(
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
  { includeRouteNames = false } = {},
): StopCatalogStop[] {
  const query = search.trim().toLowerCase();
  if (!query) {
    return [];
  }

  const searchRoutes = includeRouteNames && !/^\d+$/.test(query);
  return stops.filter(
    (stop) =>
      stop.locid.toString().includes(query) ||
      stop.desc.toLowerCase().includes(query) ||
      stop.aliases.some((alias) => alias.toLowerCase().includes(query)) ||
      (searchRoutes && stop.routes?.some(({ label }) => label.toLowerCase().includes(query))),
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
