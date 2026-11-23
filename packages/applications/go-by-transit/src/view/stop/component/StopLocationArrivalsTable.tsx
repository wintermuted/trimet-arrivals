import { Table } from "@wintermuted/ui-react";
import { map } from "lodash";
import React from "react";
import { useParams } from "react-router-dom";
import { Arrival, ArrivalData } from "../../../api/trimet/interfaces/arrivals";
import ArrivalRowContainer from "../container/ArrivalRowContainer";

function getArrivals(arrivals: Arrival[]) {
  return map(arrivals, arrival => {
    return <ArrivalRowContainer arrival={arrival} />;
  });
}

function filterArrivals(arrivals: ArrivalData, id) {
  return arrivals.arrival.filter(arrival => arrival.route === parseInt(id, 10));
}

interface Props {
  arrivalData: ArrivalData;
}

function StopLocationArrivalsTable({ arrivalData }: Props) {
  const { routeId } = useParams();

  const filteredArrivals = routeId
    ? filterArrivals(arrivalData, routeId)
    : arrivalData.arrival;

  return (
    <Table responsive={true}>
      <thead>
        <tr>
          <td />
          <td>Route</td>
          <td>Arriving In</td>
          <td>Early / Late by</td>
          <td>Scheduled / Estimated Arrivals </td>
          <td>Distance to stop</td>
        </tr>
      </thead>
      <tbody>{getArrivals(filteredArrivals)}</tbody>
    </Table>
  );
}

export default StopLocationArrivalsTable;
