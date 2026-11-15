import {
  Badge,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardText,
  CardTitle
} from "@wintermuted/ui-theme/react";
import { isEmpty } from "lodash";
import moment from "moment";
import React from "react";
import { Alert } from "../../../api/trimet/interfaces/alertsData";
import { TrimetRoute } from "../../../api/trimet/interfaces/types";
import RouteIndicator from "../../../component/route/RouteIndicator";
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

function getDates(alert: Alert) {
  const startDate = moment(alert.begin).format("MM/DD/YY");
  const endDate = alert.end ? moment(alert.end).format("MM/DD/YY") : undefined;

  if (endDate) {
    return (
      <>
        {startDate} to {endDate}
      </>
    );
  }

  return <>Starting: {startDate}</>;
}

function getAlertsContent(alertsData: Alert[]) {
  if (isEmpty(alertsData)) {
    return <Loading />;
  }

  return alertsData.map((alert: Alert) => {
    return (
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
            {alert.route &&
              alert.route.map((route: TrimetRoute) => {
                return (
                  <RouteIndicator key={route.route} routeId={route.route} />
                );
              })}
          </CardBody>
        )}
        {alert.location && (
          <CardBody>
            <CardTitle>Impacted Stops</CardTitle>
            {alert.location &&
              alert.location.map(location => {
                return (
                  <span key={location.id}>
                    <Badge tone="info">{location.id}</Badge>
                    {location.desc} - {location.dir}
                  </span>
                );
              })}
          </CardBody>
        )}
        <CardFooter style={{ color: "var(--wm-color-text-muted)" }}>
          {getDates(alert)}
        </CardFooter>
      </Card>
    );
  });
}

interface AlertsCardParams {
  alertsData: Alert[];
}

export function AlertsCard({ alertsData }: AlertsCardParams) {
  return (
    <div>
      <h5>Alerts</h5>
      <div>{getAlertsContent(alertsData)}</div>
    </div>
  );
}
