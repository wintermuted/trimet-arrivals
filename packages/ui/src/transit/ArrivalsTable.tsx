import { Table } from "@wintermuted/ui-theme/react";
import { Moment } from "moment";
import React from "react";
import type { Arrival, StopLocation } from "@trimet-arrivals/trimet-client";
import type { ArrivalRowProps } from "./ArrivalRow";
import ArrivalRows from "./ArrivalRows";
import "./Arrivals.css";

export interface ArrivalsTableProps {
  arrivals: Arrival[];
  loading: boolean;
  now: Moment;
  renderRouteIndicator: ArrivalRowProps["renderRouteIndicator"];
  formatDistance: ArrivalRowProps["formatDistance"];
  stopLocation: StopLocation;
  showMore: boolean;
}

export default class ArrivalsTable extends React.Component<ArrivalsTableProps> {
  public render() {
    const {
      arrivals,
      now,
      renderRouteIndicator,
      formatDistance,
      stopLocation,
      showMore
    } = this.props;

    if (!arrivals) {
      return null;
    }

    return (
      <Table responsive={true}>
        <thead>
          <tr>
            <th />
            <th>Name</th>
            <th>Arrival</th>
            <th>On Time</th>
            <th>Estimated / Scheduled</th>
            <th>Distance</th>
          </tr>
        </thead>
        <ArrivalRows
          arrivals={arrivals}
          renderRouteIndicator={renderRouteIndicator}
          formatDistance={formatDistance}
          stopLocation={stopLocation}
          now={now}
          showAllArrivals={showMore}
        />
      </Table>
    );
  }
}
