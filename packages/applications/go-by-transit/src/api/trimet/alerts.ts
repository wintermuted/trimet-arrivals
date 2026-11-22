import {
  getAlertsByLocationId as requestStopAlerts,
  getAlertsByRouteId as requestRouteAlerts,
  getSystemAlerts as requestSystemAlerts
} from "@overworld/trimet-client";
import { API_ID, BASE_URL } from "./constants";

const options = { baseUrl: BASE_URL, appId: API_ID };

export function getAlertsByRouteId(id: number) {
  return requestRouteAlerts(id, options);
}

export function getAlertsByLocationId(id: number) {
  return requestStopAlerts(id, options);
}

export function getSystemAlerts() {
  return requestSystemAlerts(options);
}
