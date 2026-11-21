import type { AlertsData } from "./interfaces/alertsData";
import type { TrimetClientOptions } from "./options";
import { getTrimetData } from "./util";

type AlertRequestOptions = Pick<TrimetClientOptions, "baseUrl" | "appId">;

function requestAlerts({ baseUrl, appId }: AlertRequestOptions, scope = "") {
  return getTrimetData<AlertsData>(`${baseUrl}v2/alerts/json/true/${scope}appID/${appId}`);
}

export function getAlertsByRouteId(id: number, options: AlertRequestOptions) {
  return requestAlerts(options, `route/${id}/`);
}

export function getAlertsByLocationId(id: number, options: AlertRequestOptions) {
  return requestAlerts(options, `locIDs/${id}/`);
}

export function getSystemAlerts(options: AlertRequestOptions) {
  return requestAlerts(options);
}
