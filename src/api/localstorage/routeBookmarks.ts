import { TrimetRoute } from "../trimet/interfaces/routes";

export const ROUTE_BOOKMARKS = "ROUTE_BOOKMARKS_V1";
const ROUTE_BOOKMARKS_VERSION = 1;

export interface RouteBookmark {
  route: number;
  desc: string;
  type: string;
}

export interface RouteBookmarks {
  [routeId: number]: RouteBookmark;
}

interface StoredRouteBookmarks {
  version: number;
  routes: RouteBookmarks;
}

function isRouteBookmark(value: any, routeId: string): value is RouteBookmark {
  return (
    value !== null &&
    typeof value === "object" &&
    Number.isInteger(value.route) &&
    value.route > 0 &&
    String(value.route) === routeId &&
    typeof value.desc === "string" &&
    typeof value.type === "string"
  );
}

function readStoredRouteBookmarks(): RouteBookmarks {
  const contents = localStorage.getItem(ROUTE_BOOKMARKS);
  if (contents === null) {
    return {};
  }

  let stored: StoredRouteBookmarks;
  try {
    stored = JSON.parse(contents);
  } catch {
    throw new Error("Stored route bookmarks are malformed.");
  }

  if (
    !stored ||
    stored.version !== ROUTE_BOOKMARKS_VERSION ||
    !stored.routes ||
    typeof stored.routes !== "object" ||
    Array.isArray(stored.routes)
  ) {
    throw new Error("Stored route bookmarks have an unsupported format.");
  }

  return Object.keys(stored.routes).reduce((routes, routeId) => {
    const bookmark = stored.routes[routeId];
    if (!isRouteBookmark(bookmark, routeId)) {
      throw new Error("Stored route bookmarks contain malformed records.");
    }
    routes[routeId] = bookmark;
    return routes;
  }, {} as RouteBookmarks);
}

function writeRouteBookmarks(routes: RouteBookmarks) {
  const stored: StoredRouteBookmarks = {
    routes,
    version: ROUTE_BOOKMARKS_VERSION
  };
  localStorage.setItem(ROUTE_BOOKMARKS, JSON.stringify(stored));
}

export function fetchStoredRouteBookmarks(): RouteBookmarks {
  return readStoredRouteBookmarks();
}

export function storeRouteBookmark(route: TrimetRoute): RouteBookmarks {
  if (!route || !Number.isInteger(route.route) || route.route <= 0) {
    throw new Error("A valid route is required to create a bookmark.");
  }

  const routes = readStoredRouteBookmarks();
  routes[route.route] = {
    desc: typeof route.desc === "string" ? route.desc : "",
    route: route.route,
    type: typeof route.type === "string" ? route.type : ""
  };
  writeRouteBookmarks(routes);
  return routes;
}

export function removeStoredRouteBookmark(routeId: number): RouteBookmarks {
  if (!Number.isInteger(routeId) || routeId <= 0) {
    throw new Error("A valid route ID is required to remove a bookmark.");
  }

  const routes = readStoredRouteBookmarks();
  delete routes[routeId];
  writeRouteBookmarks(routes);
  return routes;
}
