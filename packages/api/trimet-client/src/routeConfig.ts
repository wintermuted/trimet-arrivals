import { allRoutesFixtureData } from "./fixture/allRoutes";
import type { RouteDataResultSet } from "./interfaces/routes";
import type { TrimetClientOptions } from "./options";
import { getTrimetData } from "./util";

function requestRouteConfig(
  path: string,
  { baseUrl, appId }: TrimetClientOptions,
  signal?: AbortSignal
): Promise<RouteDataResultSet> {
  return getTrimetData<RouteDataResultSet>(
    `${baseUrl}V1/routeConfig/json/true/${path}/appID/${appId}`,
    signal
  );
}

export async function getRouteById(
  id: number,
  options: TrimetClientOptions,
  signal?: AbortSignal
): Promise<RouteDataResultSet> {
  return requestRouteConfig(`route/${id}/dir/true/stops/true`, options, signal);
}

export async function getRouteByIdAndDirection(
  id: number,
  direction: number,
  options: TrimetClientOptions
): Promise<RouteDataResultSet> {
  return requestRouteConfig(`route/${id}/dir/${direction}/stops/true`, options);
}

export async function getAllRoutes(options: TrimetClientOptions): Promise<RouteDataResultSet> {
  if (options.useFixtures) {
    return allRoutesFixtureData();
  }

  return requestRouteConfig("dir/true/stops/true", options);
}

export async function getSubsequentRouteStops(
  id: number,
  direction: number,
  locid: number,
  options: TrimetClientOptions
): Promise<RouteDataResultSet> {
  return requestRouteConfig(`route/${id}/dir/${direction}/stops/true/startSeq/${locid}`, options);
}
