import { sortBy } from "lodash";
import { Moment } from "moment";
import React from "react";
import type { Arrival, StopLocation, TrimetRoute } from "@overworld/trimet-client";
import ArrivalRow, { type ArrivalRowProps } from "./ArrivalRow";
import "./Arrivals.css";

function sortArrivalsByEstimatedTime(arrivals: Arrival[]): Arrival[] {
  return sortBy(arrivals, (arrival: Arrival) => arrival.estimated);
}

function getArrivalRoute(routes: TrimetRoute[], routeId: number) {
  return routes.find((route: TrimetRoute) => route.route === routeId);
}

function getVisibleArrivals(
  arrivals: Arrival[],
  showAllArrivals: boolean
): Arrival[] {
  return showAllArrivals ? arrivals : arrivals.slice(0, 5);
}

export interface ArrivalRowsProps {
  arrivals: Arrival[];
  now: Moment;
  renderRouteIndicator: ArrivalRowProps["renderRouteIndicator"];
  formatDistance: ArrivalRowProps["formatDistance"];
  stopLocation: StopLocation;
  showAllArrivals: boolean;
}

export default class ArrivalRows extends React.Component<ArrivalRowsProps> {
  public static getRows(
    arrivals: Arrival[],
    now: Moment,
    renderRouteIndicator: ArrivalRowProps["renderRouteIndicator"],
    stopLocation: StopLocation,
    showAllArrivals: boolean,
    formatDistance: ArrivalRowProps["formatDistance"]
  ) {
    const sortedArrivals = sortArrivalsByEstimatedTime(arrivals);
    const visibleArrivals = getVisibleArrivals(sortedArrivals, showAllArrivals);

    return visibleArrivals.map((arrival: Arrival) => {
      const {
        scheduled,
        estimated,
        feet,
        route: routeId,
        shortSign,
        id
      } = arrival;

      return (
        <ArrivalRow
          key={id}
          estimated={estimated}
          feet={feet}
          scheduled={scheduled}
          routeId={routeId}
          shortSign={shortSign}
          now={now}
          route={getArrivalRoute(stopLocation.route, routeId)}
          renderRouteIndicator={renderRouteIndicator}
          formatDistance={formatDistance}
        />
      );
    });
  }

  public render() {
    const {
      arrivals,
      now,
      renderRouteIndicator,
      formatDistance,
      stopLocation,
      showAllArrivals
    } = this.props;

    return (
      <tbody>
        {ArrivalRows.getRows(
          arrivals,
          now,
          renderRouteIndicator,
          stopLocation,
          showAllArrivals,
          formatDistance
        )}
      </tbody>
    );
  }
}
