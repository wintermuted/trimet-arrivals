import {
  Accordion,
  Badge,
  Card,
  CardBody,
  CardHeader,
  RefreshAction,
  Table,
} from "@wintermuted/ui-react";
import React from "react";
import type {
  Alert,
  AlertLocation,
  RouteConfigRoute,
} from "@overworld/trimet-client";
import { useTimeDisplay } from "../TimeDisplay";
import type { AlertFeedState } from "./types";
import "./Alerts.scss";

function getStopClosureTable(
  locations: AlertLocation[],
  renderLink: AllAlertsCardProps["renderStopLink"],
) {
  return (
    <Table responsive={true}>
      <thead>
        <tr>
          <th>Stop ID</th>
          <th>Desc</th>
          <th>Direction</th>
        </tr>
      </thead>
      <tbody>
        {locations.map((loc) => {
          return (
            <tr key={loc.id}>
              <td>{renderLink(loc.id)}</td>
              <td>{loc.desc}</td>
              <td>{loc.dir}</td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

function getRouteAlertTable(
  routes: RouteConfigRoute[],
  renderLink: AllAlertsCardProps["renderRouteLink"],
) {
  return (
    <Table responsive={true}>
      <thead>
        <tr>
          <th>Route ID</th>
          <th>Desc</th>
        </tr>
      </thead>
      <tbody>
        {routes.map((route) => {
          return (
            <tr key={route.id}>
              <td>{renderLink(route.id)}</td>
              <td>{route.desc}</td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

function getImpactedRoutes(routes: RouteConfigRoute[]) {
  return routes.map((route) => {
    return (
      <Badge tone="info" key={route.id}>
        {route.id}
      </Badge>
    );
  });
}

function getHeader(alert: Alert, formatDate: (timestamp: number) => string) {
  const startDate = formatDate(alert.begin);
  const endDate = alert.end ? formatDate(alert.end) : undefined;

  return (
    <>
      {startDate} to {endDate ? endDate : "Unknown"}
    </>
  );
}

export interface AllAlertsCardProps extends AlertFeedState {
  alertsData: Alert[] | undefined;
  renderStopLink: (stopId: number) => React.ReactNode;
  renderRouteLink: (routeId: number) => React.ReactNode;
}

function getAlertsAccordion(
  {
    alertsData,
    loading,
    error,
    onRefresh,
    loadingContent,
    renderStopLink,
    renderRouteLink,
  }: AllAlertsCardProps,
  formatDate: (timestamp: number) => string,
) {
  if (loading && !alertsData) {
    return loadingContent;
  }
  if (!alertsData?.length) {
    return (
      <>
        {error && (
          <p role="alert">
            {alertsData !== undefined
              ? "Could not refresh alerts. Showing the last received alerts."
              : "Could not load alerts. Try again."}
          </p>
        )}
        {!error && <p role="status">No route or stop alerts right now.</p>}
        <RefreshAction
          size="sm"
          onRefresh={onRefresh}
          loading={loading}
          error={error}
          labels={{
            idle: "Refresh",
            loading: "Refreshing...",
            retry: "Try again",
          }}
        />
      </>
    );
  }

  return (
    <div>
      {error && (
        <p role="alert">
          Could not refresh alerts. Showing the last received alerts.
        </p>
      )}
      <RefreshAction
        size="sm"
        onRefresh={onRefresh}
        loading={loading}
        error={error}
        labels={{
          idle: "Refresh",
          loading: "Refreshing...",
          retry: "Try again",
        }}
      />
      {alertsData &&
        alertsData.map((alert) => {
          return (
            <Accordion
              key={alert.id}
              open={String(alert.id) === "0"}
              title={
                <span className="transit-alert-heading">
                  {alert.location && <Badge tone="warning">Stop Closure</Badge>}
                  {alert.route && getImpactedRoutes(alert.route)}
                  <span>
                    {alert.id} - {alert.header_text}
                  </span>
                  <small>{getHeader(alert, formatDate)}</small>
                </span>
              }
            >
              {alert.desc}
              <br />
              {alert.location &&
                getStopClosureTable(alert.location, renderStopLink)}
              {alert.route && getRouteAlertTable(alert.route, renderRouteLink)}
            </Accordion>
          );
        })}
    </div>
  );
}

function AllAlertsCard(props: AllAlertsCardProps) {
  const { formatDate } = useTimeDisplay();
  return (
    <Card>
      <CardHeader>Route & Stop Alerts</CardHeader>
      <CardBody>{getAlertsAccordion(props, formatDate)}</CardBody>
    </Card>
  );
}

export default AllAlertsCard;
