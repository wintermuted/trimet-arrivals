import { ListItem } from "@wintermuted/ui-theme/react";
import React from "react";
import { Link } from "react-router-dom";
import { Arrival } from "../../../../api/trimet/interfaces/arrivals";
import { getFormattedTime } from "../../util/timeUtils";
import TimeDiffBadge from "./TimeDiffBadge";
import "./SimpleArrivalListItem.scss";

interface ArrivalListItemParams {
  id: any;
  arrival: Arrival;
}

function ArrivalListItem({ id, arrival }: ArrivalListItemParams) {
  const estimatedArrivalTime = arrival.estimated;
  const scheduledArrivalTime = arrival.scheduled;
  const scheduledTime = getFormattedTime(scheduledArrivalTime);

  return (
    <ListItem style={{ padding: 0 }}>
      <Link
        className="transit-arrival-link transit-stop-arrival-link"
        to={`/nearby/simple-routes/${arrival.route}?stop=${arrival.locid}&direction=${arrival.dir}`}
      >
        <strong className="transit-stop-arrival-sign">
          {arrival.shortSign}
        </strong>
        <div className="transit-stop-arrival-times">
          <TimeDiffBadge
            estimatedArrivalTime={estimatedArrivalTime}
            scheduledArrivalTime={scheduledArrivalTime}
          />
          {estimatedArrivalTime ? (
            <small>Estimated: {getFormattedTime(estimatedArrivalTime)}</small>
          ) : null}
          <small>Scheduled: {scheduledTime}</small>
        </div>
      </Link>
    </ListItem>
  );
}

export default ArrivalListItem;
