import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardText,
  CardTitle
} from "@wintermuted/ui-theme/react";
import React from "react";
import type { Alert } from "@trimet-arrivals/trimet-client";
import { useTimeDisplay } from "../TimeDisplay";
import type { AlertFeedState } from "./types";

function getLink(alert: Alert) {
  if (!alert.info_link_url) {
    return null;
  }

  return <a href={alert.info_link_url}>{alert.info_link_url}</a>;
}

function getHeader(alert: Alert) {
  const title = alert.header_text ? (
    alert.header_text
  ) : (
    <span>
      <strong>No Service:</strong> {alert.id}
    </span>
  );
  const systemAlert = alert.system_wide_flag ? (
    <strong>System Alert:</strong>
  ) : null;
  return (
    <>
      <span>{systemAlert}</span>
      <span>{title}</span>
    </>
  );
}

function getDates(
  alert: Alert,
  formatDate: (timestamp: number) => string
) {
  const startDate = formatDate(alert.begin);
  const endDate = alert.end ? formatDate(alert.end) : undefined;

  if (endDate) {
    return (
      <>
        {startDate} to {endDate}
      </>
    );
  }

  return <>Starting: {startDate}</>;
}

export interface StopAlertsCardProps extends AlertFeedState {
  alertsData: Alert[] | undefined;
  renderRouteIndicator: (routeId: number) => React.ReactNode;
}

function getAlertsContent(
  { alertsData, loading, error, onRefresh, loadingContent, renderRouteIndicator }: StopAlertsCardProps,
  formatDate: (timestamp: number) => string
) {
  const scopedAlerts = alertsData || [];
  if (loading && !alertsData) {
    return loadingContent;
  }

  return (
    <>
      {error && (
        <p role="alert">
          {alertsData !== undefined
            ? "Could not refresh alerts. Showing the last received alerts."
            : "Could not load alerts for this stop. Try again."}
        </p>
      )}
      {scopedAlerts.length ? scopedAlerts.map((alert: Alert) => (
        <Card
          key={alert.id}
          style={{
            background: "var(--wm-color-warning-soft)",
            marginBottom: ".25rem"
          }}
        >
          <CardHeader>{getHeader(alert)}</CardHeader>
          <CardBody>
            <CardText>{alert.desc}</CardText>
            {getLink(alert)}
          </CardBody>
          {alert.route && (
            <CardBody>
              <CardTitle>Impacted Routes</CardTitle>
              {alert.route.map(route => (
                <React.Fragment key={route.route}>{renderRouteIndicator(route.route)}</React.Fragment>
              ))}
            </CardBody>
          )}
          {alert.location && (
            <CardBody>
              <CardTitle>Impacted Stops</CardTitle>
              {alert.location.map(location => (
                <span key={location.id}>
                  <Badge tone="info">{location.id}</Badge>
                  {location.desc} - {location.dir}
                </span>
              ))}
            </CardBody>
          )}
          <CardFooter style={{ color: "var(--wm-color-text-muted)" }}>
            {getDates(alert, formatDate)}
          </CardFooter>
        </Card>
      )) : !error ? <p role="status">No active alerts for this stop.</p> : null}
      <Button type="button" size="sm" onClick={onRefresh} disabled={loading}>
        {loading ? "Refreshing..." : error ? "Try again" : "Refresh"}
      </Button>
    </>
  );
}

export function StopAlertsCard(props: StopAlertsCardProps) {
  const { formatDate } = useTimeDisplay();
  return (
    <div>
      <h5>Alerts</h5>
      <div>{getAlertsContent(props, formatDate)}</div>
    </div>
  );
}
