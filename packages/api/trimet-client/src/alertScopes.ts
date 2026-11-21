import type { Alert } from "./interfaces/alertsData";

export function getAlertsForRoute(alerts: Alert[], routeId: number): Alert[] {
  return alerts.filter(alert =>
    alert.system_wide_flag ||
    !alert.route?.length ||
    alert.route.some(route => route.route === routeId)
  );
}

export function getAlertsForStop(alerts: Alert[], stopId: number): Alert[] {
  return alerts.filter(alert =>
    alert.system_wide_flag ||
    !alert.location?.length ||
    alert.location.some(location => location.id === stopId)
  );
}
