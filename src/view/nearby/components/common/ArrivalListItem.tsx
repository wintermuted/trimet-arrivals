import { ListItem } from "@wintermuted/ui-theme/react";
import React from "react";
import { Link } from "react-router-dom";
import { Arrival } from "../../../../api/trimet/interfaces/arrivals";
import { getFormattedTime } from "../../util/timeUtils";
import TimeDiffBadge from "./TimeDiffBadge";

interface ArrivalListItemParams {
  id: any;
  arrival: Arrival;
}

function ArrivalListItem({ id, arrival }: ArrivalListItemParams) {
  const estimatedArrivalTime = arrival.estimated;
  const scheduledArrivalTime = arrival.scheduled;
  const scheduledTime = getFormattedTime(scheduledArrivalTime);

  return (
    <ListItem>
      <Link
        className="transit-arrival-link"
        to={`/nearby/simple-routes/${arrival.route}?stop=${arrival.locid}&direction=${arrival.dir}`}
      >
        <div>
          <span style={{ fontWeight: 700 }}>{arrival.shortSign}</span>
          <div>
            {estimatedArrivalTime ? (
              <small>
                Estimated: {getFormattedTime(estimatedArrivalTime)} /{" "}
                {scheduledTime}
              </small>
            ) : (
              <small>Scheduled: {scheduledTime}</small>
            )}
          </div>
        </div>
        <TimeDiffBadge
          estimatedArrivalTime={estimatedArrivalTime}
          scheduledArrivalTime={scheduledArrivalTime}
        />
      </Link>
    </ListItem>
  );
}

export default ArrivalListItem;
