import {
  getAllRoutes as requestAllRoutes,
  getRouteById as requestRouteById,
  getRouteByIdAndDirection as requestRouteByIdAndDirection,
  getSubsequentRouteStops as requestSubsequentRouteStops
} from "@overworld/trimet-client";
import { fixtureEnabled } from "../util";
import { API_ID, BASE_URL } from "./constants";

const options = { baseUrl: BASE_URL, appId: API_ID };

export function getRouteById(id: number, signal?: AbortSignal) {
  return requestRouteById(id, options, signal);
}

export function getRouteByIdAndDirection(id: number, direction: number) {
  return requestRouteByIdAndDirection(id, direction, options);
}

export function getAllRoutes() {
  return requestAllRoutes({ ...options, useFixtures: fixtureEnabled() === true });
}

export function getSubsequentRouteStops(id: number, direction: number, locid: number) {
  return requestSubsequentRouteStops(id, direction, locid, options);
}
