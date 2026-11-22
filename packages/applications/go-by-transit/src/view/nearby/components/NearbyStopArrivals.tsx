import { Select, Table } from "@wintermuted/ui-theme/react";
import { map, sortBy } from "lodash";
import moment from "moment";
import React, { useId, useState } from "react";
import FontAwesome from "react-fontawesome";
import { useParams } from "react-router-dom";
import { Arrival, ArrivalData } from "../../../api/trimet/interfaces/arrivals";
import { useTimeDisplay } from "@overworld/ui";
import ArrivalListItem from "./common/ArrivalListItem";
import "./NearbyRoutes.scss";

interface StopArrivalsParams {
  data: ArrivalData;
  selectedRoutes: number[];
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

export function ArrivalList({ data, selectedRoutes = [] }: ArrivalsTableParams & { selectedRoutes?: number[] }) {
  const { id } = useParams();
  const filterId = useId();
  const [groupBy, setGroupBy] = useState<"none" | "route">("none");
  const sortedArrivals = sortArrivalsByEstimated(data.arrival);
  const filteredArrivals = selectedRoutes.length
    ? sortedArrivals.filter(arrival => selectedRoutes.includes(arrival.route))
    : sortedArrivals;
  const groups = new Map<number, Arrival[]>();
  filteredArrivals.forEach(arrival => {
    const group = groups.get(arrival.route) || [];
    group.push(arrival);
    groups.set(arrival.route, group);
  });
  const arrivalsList = (arrivals: Arrival[]) => arrivals.map(arrival =>
    <ArrivalListItem key={arrival.id} id={id} arrival={arrival} />
  );

  return (
    <details id="stop-departures" className="transit-simple-route-direction transit-stop-departures" open>
      <summary><FontAwesome name="caret-right" aria-hidden="true" />Departures</summary>
      <div className="transit-stop-departures-group-control">
        <label htmlFor={filterId}>Group by</label>
        <Select id={filterId} value={groupBy} onChange={event => {
          if (event.target.value === "none" || event.target.value === "route") {
            setGroupBy(event.target.value);
          }
        }}>
          <option value="none">None</option>
          <option value="route">Route</option>
        </Select>
      </div>
      {filteredArrivals.length ? (
        groupBy === "route" ? (
          Array.from(groups.entries()).sort(([a], [b]) => a - b).map(([route, arrivals]) => (
            <section className="transit-stop-departures-group" key={route} aria-label={`Route ${route}`}>
              <h4>Route {route}</h4>
              <ul className="transit-stop-departures-list">{arrivalsList(arrivals)}</ul>
            </section>
          ))
        ) : <ul className="transit-stop-departures-list">{arrivalsList(filteredArrivals)}</ul>
      ) : (
        <p className="transit-route-list-message" role="status">
          {selectedRoutes.length ? "No departures for the selected routes." : "No departures available."}
        </p>
      )}
    </details>
  );
}

function getArrivalRows(data: ArrivalData, formatTime: (timestamp: number) => string) {
  const sortedArrivals = sortArrivalsByEstimated(data.arrival);
  return map(sortedArrivals, (arrival: Arrival) => {
    const estimatedTime = arrival.estimated
      ? formatTime(arrival.estimated)
      : "No estimation";
    const scheduledTime = formatTime(arrival.scheduled);

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
  const { formatTime } = useTimeDisplay();
  return (
    <Table responsive={true}>
      <thead>
        <tr>
          <th>Route</th>
          <th>Est. Arrival</th>
          <th>Scheduled</th>
        </tr>
      </thead>
      <tbody>{getArrivalRows(data, formatTime)}</tbody>
    </Table>
  );
}

function StopArrivals({ data, selectedRoutes }: StopArrivalsParams) {
  return <ArrivalList data={data} selectedRoutes={selectedRoutes} />;
}

export default StopArrivals;
