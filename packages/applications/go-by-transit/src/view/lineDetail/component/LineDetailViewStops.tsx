import { Table } from "@wintermuted/ui-react";
import { filter, flatten, includes, isEmpty, map, mapKeys } from "lodash";
import React from "react";
import FontAwesome from "react-fontawesome";
import { Link } from "react-router-dom";
import { Alert } from "../../../api/trimet/interfaces/alertsData";
import {
  RouteDirectionStop,
  RouteStopDirection,
  TrimetRoute
} from "../../../api/trimet/interfaces/routes";
import Loading from "../../loading/Loading";
import "./LineDetailView.scss";

function getRouteDirectionStops(
  stops: RouteDirectionStop[],
  stopsWithAlerts: number[]
) {
  return map(stops, stop => {
    const stopHasAlert = includes(stopsWithAlerts, stop.locid);

    return (
      <tr>
        <td>
          <Link to={`/stop/${stop.locid}`}>
            <small>{stop.locid}</small>
          </Link>
        </td>
        <td>
          <small>{stop.desc}</small>
        </td>
        <td>
          <small>{stop.dir}</small>
        </td>
        <td>
          {stopHasAlert && (
            <span>
              <FontAwesome name="bell-exclamation" /> Alerts
            </span>
          )}
        </td>
      </tr>
    );
  });
}

function getRouteDirections(
  routeDirections: RouteStopDirection[],
  stopsWithAlerts: number[]
) {
  return map(routeDirections, routeDirection => {
    return (
      <div className="transit-column">
        <header>
          <h3 style={{ fontSize: "1rem" }}>{routeDirection.desc}</h3>
          <Table responsive={true}>
            <thead>
              <tr>
                <td>Stop ID</td>
                <td>Name</td>
                <td>Direction</td>
                <td>Alerts</td>
              </tr>
            </thead>
            <tbody>
              {getRouteDirectionStops(routeDirection.stop, stopsWithAlerts)}
            </tbody>
          </Table>
        </header>
      </div>
    );
  });
}

interface Props {
  route: TrimetRoute;
  alertsData: Alert[];
}

export default function LineDetailViewStops(props: Props) {
  const { route, alertsData } = props;

  if (!route.dir) {
    return <Loading />;
  }

  const mappedAlerts = flatten(
    map(alertsData, (alert: Alert) =>
      map(alert.location, location => location.id)
    )
  );

  return (
    <div className="transit-columns">
      {getRouteDirections(route.dir, mappedAlerts)}
    </div>
  );
}
