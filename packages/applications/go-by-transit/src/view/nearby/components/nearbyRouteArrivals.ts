import { each, filter, groupBy } from "lodash";
import { WalkingEstimate } from "../../../api/mapbox/walking";
import { Arrival, ArrivalData } from "../../../api/trimet/interfaces/arrivals";
import { Direction, StopData, StopLocation, TrimetRoute } from "../../../api/trimet/interfaces/types";
import { getDistance } from "../util/turfUtils";

export interface RouteStop {
  stop: StopLocation;
  arrivals: Arrival[];
  distanceMiles?: number;
  walkingEstimate?: WalkingEstimate;
}

function stopDistance(stop: RouteStop, walking: boolean) {
  return walking
    ? stop.walkingEstimate?.status === "ready" ? stop.walkingEstimate.meters : Infinity
    : stop.distanceMiles ?? Infinity;
}

function getRouteName(route: TrimetRoute): string {
  const prefix = `${route.route}-`;
  return route.desc.startsWith(prefix)
    ? route.desc.slice(prefix.length).trimStart()
    : route.desc;
}

export interface RouteStructure {
  key: string;
  route: TrimetRoute;
  direction: Direction;
  stops: RouteStop[];
}
export function getArrivalTime(arrival?: Arrival): number | undefined {
  if (!arrival) {
    return undefined;
  }
  const timestamp = arrival.estimated || arrival.scheduled;
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : undefined;
}

function hasCurrentLocation(currentLocation: number[]): boolean {
  return Boolean(
    currentLocation?.length >= 2 &&
    Number.isFinite(currentLocation[0]) &&
    Number.isFinite(currentLocation[1])
  );
}

export function getRouteArrivals(
  arrivalData: ArrivalData,
  nearbyStops: StopData,
  currentLocation: number[],
  walkingEstimates?: ReadonlyMap<number, WalkingEstimate>
): RouteStructure[] {
  const arrivalsByLocation = groupBy(arrivalData?.arrival || [], "locid");
  const routeDirections = new Map<
    string,
    {
      route: TrimetRoute;
      direction: Direction;
      stops: Map<number, RouteStop>;
    }
  >();
  const locationIsAvailable = hasCurrentLocation(currentLocation);

  each(nearbyStops?.location || [], (stop: StopLocation) => {
    if (stop.locid == null) {
      return;
    }

    each(stop.route || [], (route: TrimetRoute) => {
      each(route.dir || [], (direction: Direction) => {
        const key = `${route.route}-${direction.dir}`;
        let routeDirection = routeDirections.get(key);
        if (!routeDirection) {
          routeDirection = {
            direction,
            route,
            stops: new Map<number, RouteStop>(),
          };
          routeDirections.set(key, routeDirection);
        }

        const stopArrivals = filter(
          arrivalsByLocation[stop.locid],
          (arrival: Arrival) =>
            arrival.route === route.route && arrival.dir === direction.dir
        ).sort(
          (a, b) =>
            (getArrivalTime(a) ?? Infinity) - (getArrivalTime(b) ?? Infinity)
        );
        const stopHasCoordinates =
          Number.isFinite(stop.lng) && Number.isFinite(stop.lat);

        routeDirection.stops.set(stop.locid, {
          arrivals: stopArrivals,
          distanceMiles:
            locationIsAvailable && stopHasCoordinates
              ? getDistance(currentLocation, [stop.lng, stop.lat])
              : undefined,
          stop,
          walkingEstimate: walkingEstimates?.get(stop.locid),
        });
      });
    });
  });

  return Array.from(routeDirections, ([key, routeDirection]) => ({
    direction: routeDirection.direction,
    key,
    route: routeDirection.route,
    stops: Array.from(routeDirection.stops.values()).sort((a, b) => {
      if (walkingEstimates) {
        return stopDistance(a, true) - stopDistance(b, true) ||
          Number(a.stop.locid) - Number(b.stop.locid);
      }
      if (a.distanceMiles != null && b.distanceMiles != null) {
        return (
          a.distanceMiles - b.distanceMiles ||
          Number(a.stop.locid) - Number(b.stop.locid)
        );
      }
      return Number(a.stop.locid) - Number(b.stop.locid);
    }),
  })).sort(
    (a, b) =>
      a.route.route - b.route.route ||
      a.direction.desc.localeCompare(b.direction.desc) ||
      a.direction.dir - b.direction.dir
  );
}

export function filterRouteStructures(
  routes: RouteStructure[],
  selectedValues: string[]
): RouteStructure[] {
  if (selectedValues.length === 0) {
    return routes;
  }

  const selectedRoutes = new Set(
    selectedValues
      .filter((value) => value.startsWith("route:"))
      .map((value) => value.slice("route:".length))
  );
  const selectedDirections = new Set(
    selectedValues
      .filter((value) => value.startsWith("direction:"))
      .map((value) => value.slice("direction:".length))
  );

  return routes.filter(
    (route) =>
      selectedRoutes.has(String(route.route.route)) ||
      selectedDirections.has(route.key)
  );
}
export type RouteSort = "arrival" | "distance" | "route";

export function getDisplayRoutes(
  filteredRoutes: RouteStructure[],
  sortBy: RouteSort,
  walkingEnabled: boolean
) {
  const groupedRoutes = new Map<number, RouteStructure[]>();
  filteredRoutes.forEach((route) => {
    const directions = groupedRoutes.get(route.route.route) || [];
    directions.push(route);
    groupedRoutes.set(route.route.route, directions);
  });
  return Array.from(groupedRoutes.values())
    .map((directions) => ({
      directions,
      distance: Math.min(
        ...directions.flatMap((direction) =>
          direction.stops.map((stop) => stopDistance(stop, walkingEnabled))
        )
      ),
      nextArrival: Math.min(
        ...directions.flatMap((direction) =>
          direction.stops.map(
            (stop) => getArrivalTime(stop.arrivals[0]) ?? Infinity
          )
        )
      ),
      route: directions[0].route,
      routeName: getRouteName(directions[0].route),
    }))
    .sort((a, b) => {
      if (sortBy === "route") {
        return a.route.route - b.route.route;
      }
      if (sortBy === "distance") {
        return a.distance - b.distance || a.route.route - b.route.route;
      }

      return (
        a.nextArrival - b.nextArrival ||
        a.distance - b.distance ||
        a.route.route - b.route.route
      );
    });
}
