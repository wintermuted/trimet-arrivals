import { ListItem } from "@wintermuted/ui-react";
import React from "react";
import { Link } from "react-router-dom";
import { Arrival } from "../../../../api/trimet/interfaces/arrivals";
import {
  Direction,
  StopLocation,
  TrimetRoute
} from "../../../../api/trimet/interfaces/types";
import { getTimeUntilArrival } from "../../util/timeUtils";
import "./SimpleArrivalListItem.scss";

interface ArrivalListItemParams {
  id: any;
  arrival: Arrival;
  route: TrimetRoute;
  stop: StopLocation;
}

function SimpleArrivalListItem({
  id,
  arrival,
  route,
  stop
}: ArrivalListItemParams) {
  if (!arrival || !route || !stop) {
    return null;
  }

  const estimatedArrivalTime = arrival.estimated;
  const scheduledArrivalTime = arrival.scheduled;
  const routeDirection: Direction = route.dir[0];
  const routeId = route.route;
  const stopName = stop.desc;
  const timeUntilArrival = getTimeUntilArrival(
    estimatedArrivalTime,
    scheduledArrivalTime
  );

  return (
    <ListItem>
      <Link
        className="transit-arrival-link"
        to={`/nearby/simple-routes/${routeId}?stop=${stop.locid}&direction=${routeDirection.dir}`}
      >
        <div className="transit-simple-arrival-content">
          <div className="transit-arrival-heading">
            <strong className="transit-arrival-route">{routeId}</strong>
            <span title={routeDirection.desc}>{routeDirection.desc}</span>
          </div>
          <small title={`at ${stopName} (${stop.locid})`}>
            at {stopName} ({stop.locid})
          </small>
        </div>
        <div>
          <strong className="transit-arrival-time">{timeUntilArrival}</strong>
          <br />
        </div>
      </Link>
    </ListItem>
  );
}

export default SimpleArrivalListItem;
