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
import { getAlertsForStop } from "../../../api/trimet/alertScopes";
import { Alert } from "../../../api/trimet/interfaces/alertsData";
import { TrimetRoute } from "../../../api/trimet/interfaces/types";
import RouteIndicator from "../../../component/route/RouteIndicator";
import { useTimeDisplay } from "@trimet-arrivals/ui";
import Loading from "../../loading/Loading";

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

interface AlertsCardParams {
  alertsData: Alert[] | undefined;
  stopId: number;
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
}

function getAlertsContent(
  { alertsData, stopId, loading, error, onRefresh }: AlertsCardParams,
  formatDate: (timestamp: number) => string
) {
  const scopedAlerts = getAlertsForStop(alertsData || [], stopId);
  if (loading && !alertsData) {
    return <Loading />;
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
              {alert.route.map((route: TrimetRoute) => (
                <RouteIndicator key={route.route} routeId={route.route} />
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

export function AlertsCard(props: AlertsCardParams) {
  const { formatDate } = useTimeDisplay();
  return (
    <div>
      <h5>Alerts</h5>
      <div>{getAlertsContent(props, formatDate)}</div>
    </div>
  );
}
