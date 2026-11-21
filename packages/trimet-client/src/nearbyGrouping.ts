import { flatten, groupBy, map, mapKeys, mapValues } from "lodash";
import type {
  Direction,
  StopData,
  StopLocation,
  TrimetRoute
} from "./interfaces/types";

type RoutesById = Record<string, TrimetRoute[]>;
export type NearbyRoutesDictionary = Record<number, { directions: number[] }>;
export type StopLocationsDictionary = Record<number, StopLocation>;

export function processRoutes(stopData: StopData): RoutesById {
  const routes = stopData.location.map((location: StopLocation) => {
    return location.route.map((route: TrimetRoute) => route);
  });
  const mappedKeys = mapKeys(
    flatten(routes),
    (item: TrimetRoute) => `${item.route}-${item.dir[0].dir}`
  );

  return groupBy(mappedKeys, (key: TrimetRoute) => key.route);
}

export function getNearbyRouteIds(
  nearbyRoutes: RoutesById
): NearbyRoutesDictionary {
  return mapValues(nearbyRoutes, (routes: TrimetRoute[]) => {
    const directions = map(routes, (route: TrimetRoute) => {
      return map(route.dir, (dir: Direction) => {
        return dir.dir;
      });
    });

    return {
      directions: flatten(directions)
    };
  });
}

export function getStopLocations(
  nearbyStops: StopData
): StopLocationsDictionary {
  return mapKeys(nearbyStops.location, (location: StopLocation) => {
    return location.locid;
  });
}
