import {
  Select,
  Table
} from "@wintermuted/ui-theme/react";
import { map, sortBy } from "lodash";
import moment from "moment";
import React, { useId, useState } from "react";
import FontAwesome from "react-fontawesome";
import { useParams } from "react-router-dom";
import { Arrival, ArrivalData } from "../../../api/trimet/interfaces/arrivals";
import { getFormattedTime } from "../util/timeUtils";
import ArrivalListItem from "./common/ArrivalListItem";
import "./NearbyRoutes.scss";

interface StopArrivalsParams {
  data: ArrivalData;
}

function sortArrivalsByEstimated(arrivals: Arrival[]): Arrival[] {
  return sortBy(arrivals, arrival =>
    moment(arrival.scheduled)
      .utc()
      .valueOf()
  );
}

interface ArrivalsTableParams {
  data: ArrivalData;
}

function getArrivalsList(sortedArrivals: Arrival[]) {
  const { id } = useParams();

  return map(sortedArrivals, (arrival: Arrival) => {
    return <ArrivalListItem key={arrival.id} id={id} arrival={arrival} />;
  });
}

export function ArrivalList({ data }: ArrivalsTableParams) {
  const [selectedRoute, setSelectedRoute] = useState("");
  const filterId = useId();
  const routes = Array.from(new Set(data.arrival.map(arrival => arrival.route)));
  if (selectedRoute && !routes.includes(Number(selectedRoute))) {
    routes.push(Number(selectedRoute));
  }
  routes.sort((a, b) => a - b);
  const sortedArrivals = sortArrivalsByEstimated(data.arrival);
  const filteredArrivals = selectedRoute
    ? sortedArrivals.filter(arrival => String(arrival.route) === selectedRoute)
    : sortedArrivals;
  const arrivalsList = getArrivalsList(filteredArrivals);

  return (
    <details className="transit-simple-route-direction" open>
      <summary><FontAwesome name="caret-right" aria-hidden="true" />Departures</summary>
      <div className="transit-stop-departures-filter">
        <label htmlFor={filterId}>Filter by route</label>
        <Select id={filterId} value={selectedRoute} onChange={event => setSelectedRoute(event.target.value)}>
          <option value="">All routes</option>
          {routes.map(route => <option key={route} value={route}>Route {route}</option>)}
        </Select>
      </div>
      {filteredArrivals.length ? (
        <ul className="transit-stop-departures-list">{arrivalsList}</ul>
      ) : (
        <p className="transit-route-list-message" role="status">
          {selectedRoute ? `No departures for route ${selectedRoute}.` : "No departures available."}
        </p>
      )}
    </details>
  );
}

function getArrivalRows(data: ArrivalData) {
  const sortedArrivals = sortArrivalsByEstimated(data.arrival);
  return map(sortedArrivals, (arrival: Arrival) => {
    const estimatedTime = arrival.estimated
      ? getFormattedTime(arrival.estimated)
      : "No estimation";
    const scheduledTime = getFormattedTime(arrival.scheduled);

    return (
      <tr key={arrival.id}>
        <td>
          <small>{arrival.shortSign}</small>
        </td>
        <td>
          <small>{estimatedTime}</small>
        </td>
        <td>
          <small>{scheduledTime}</small>
        </td>
      </tr>
    );
  });
}

function ArrivalsTable({ data }: ArrivalsTableParams) {
  return (
    <Table responsive={true}>
      <thead>
        <tr>
          <th>Route</th>
          <th>Est. Arrival</th>
          <th>Scheduled</th>
        </tr>
      </thead>
      <tbody>{getArrivalRows(data)}</tbody>
    </Table>
  );
}

function StopArrivals({ data }: StopArrivalsParams) {
  return <ArrivalList data={data} />;
}

export default StopArrivals;
