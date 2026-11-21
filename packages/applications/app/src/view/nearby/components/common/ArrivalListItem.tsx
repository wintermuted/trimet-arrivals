import React from "react";
import { Link } from "react-router-dom";
import { Arrival } from "../../../../api/trimet/interfaces/arrivals";
import { useTimeDisplay } from "@trimet-arrivals/ui";
import TimeDiffBadge from "./TimeDiffBadge";
import "./SimpleArrivalListItem.scss";

interface ArrivalListItemParams {
  id: any;
  arrival: Arrival;
}

function ArrivalListItem({ id, arrival }: ArrivalListItemParams) {
  const { formatTime } = useTimeDisplay();
  const estimatedArrivalTime = arrival.estimated;
  const scheduledArrivalTime = arrival.scheduled;
  const scheduledTime = formatTime(scheduledArrivalTime);

  return (
    <li>
      <Link
        className="transit-arrival-link transit-stop-arrival-link"
        to={`/nearby/simple-routes/${arrival.route}?stop=${arrival.locid}&direction=${arrival.dir}`}
      >
        <strong className="transit-stop-arrival-sign" title={arrival.shortSign}>
          {arrival.shortSign}
        </strong>
        <div className="transit-stop-arrival-times">
          <TimeDiffBadge
            estimatedArrivalTime={estimatedArrivalTime}
            scheduledArrivalTime={scheduledArrivalTime}
          />
          <span className="transit-stop-arrival-clock-times">
            {estimatedArrivalTime ? (
              <small>Estimated: {formatTime(estimatedArrivalTime)}</small>
            ) : null}
            <small>Scheduled: {scheduledTime}</small>
          </span>
        </div>
      </Link>
    </li>
  );
}

export default ArrivalListItem;
