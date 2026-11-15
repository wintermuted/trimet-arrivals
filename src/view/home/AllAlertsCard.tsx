import {
  Accordion,
  Badge,
  Card,
  CardHeader,
  Table
} from "@wintermuted/ui-theme/react";
import { isEmpty } from "lodash";
import moment from "moment";
import React from "react";
import { Link } from "react-router-dom";
import { Alert } from "../../api/trimet/interfaces/alertsData";
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

function getHeader(alert) {
  const startDate = moment(alert.begin).format("MM-DD-YY");
  const endDate = alert.end ? moment(alert.end).format("MM-DD-YY") : undefined;

  return (
    <>
      {startDate} to {endDate ? endDate : "Unknown"}
    </>
  );
}

interface Props {
  alertsData: Alert[];
}

function getAlertsAccordion(alertsData: Alert[]) {
  if (isEmpty(alertsData)) {
    return <Loading />;
  }

  return (
    <div>
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
                  <small>{getHeader(alert)}</small>
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

function AllAlertsCard({ alertsData }: Props) {
  return (
    <Card>
      <CardHeader>Route & Stop Alerts</CardHeader>
      {getAlertsAccordion(alertsData)}
    </Card>
  );
}

export default AllAlertsCard;
