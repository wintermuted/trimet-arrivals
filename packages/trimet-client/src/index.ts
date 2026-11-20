export { getAlertsByLocationId, getAlertsByRouteId, getSystemAlerts } from "./alerts";
export { getAlertsForRoute, getAlertsForStop } from "./alertScopes";
export { getArrivals } from "./arrivals";
export { getNearbyStops } from "./stops";
export { getTrimetData } from "./util";
export type { TrimetClientOptions } from "./options";
export type { Alert, AlertsData, Location as AlertLocation } from "./interfaces/alertsData";
export type {
  RouteData,
  RouteDataResultSet,
  RouteDirectionStop,
  RouteStopDirection,
  TrimetRoute as RouteConfigRoute
} from "./interfaces/routes";
export type {
  Arrival,
  ArrivalData,
  ArrivalLocation,
  BlockPosition,
  Detour
} from "./interfaces/arrivals";
export type {
  Coords,
  Direction,
  Location,
  StopData,
  StopLocation,
  TrimetRoute,
  Trip
} from "./interfaces/types";
