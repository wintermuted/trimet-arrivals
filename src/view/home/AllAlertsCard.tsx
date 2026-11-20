import {
  Accordion,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Table
} from "@wintermuted/ui-theme/react";
import React from "react";
import { Link } from "react-router-dom";
import { Alert } from "../../api/trimet/interfaces/alertsData";
import { useTimeDisplay } from "@trimet-arrivals/ui";
import Loading from "../loading/Loading";

function getStopClosureTable(locations) {
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
        {locations.map(loc => {
          return (
            <tr key={loc.id}>
              <td>
                <Link to={`/stop/${loc.id}`}>{loc.id}</Link>
              </td>
              <td>{loc.desc}</td>
              <td>{loc.dir}</td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

function getRouteAlertTable(routes) {
  return (
    <Table responsive={true}>
      <thead>
        <tr>
          <th>Route ID</th>
          <th>Desc</th>
        </tr>
      </thead>
      <tbody>
        {routes.map(route => {
          return (
            <tr key={route.id}>
              <td>
                <Link to={`/lines/${route.id}`}>{route.id}</Link>
              </td>
              <td>{route.desc}</td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

function getImpactedRoutes(routes) {
  return routes.map(route => {
    return (
      <Badge tone="info" key={route.id}>
        {route.id}
      </Badge>
    );
  });
}

function getHeader(alert, formatDate) {
  const startDate = formatDate(alert.begin);
  const endDate = alert.end ? formatDate(alert.end) : undefined;

  return (
    <>
      {startDate} to {endDate ? endDate : "Unknown"}
    </>
  );
}

interface Props {
  alertsData: Alert[] | undefined;
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
}

function getAlertsAccordion(
  { alertsData, loading, error, onRefresh }: Props,
  formatDate: (timestamp: number) => string
) {
  if (loading && !alertsData) {
    return <Loading />;
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
        <Button type="button" size="sm" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing..." : error ? "Try again" : "Refresh"}
        </Button>
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
      <Button type="button" size="sm" onClick={onRefresh} disabled={loading}>
        {loading ? "Refreshing..." : error ? "Try again" : "Refresh"}
      </Button>
      {alertsData &&
        alertsData.map(alert => {
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
              {alert.location && getStopClosureTable(alert.location)}
              {alert.route && getRouteAlertTable(alert.route)}
            </Accordion>
          );
        })}
    </div>
  );
}

function AllAlertsCard(props: Props) {
  const { formatDate } = useTimeDisplay();
  return (
    <Card>
      <CardHeader>Route & Stop Alerts</CardHeader>
      <CardBody>{getAlertsAccordion(props, formatDate)}</CardBody>
    </Card>
  );
}

export default AllAlertsCard;
