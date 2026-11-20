import { Badge } from "@wintermuted/ui-theme/react";
import moment from "moment";
import React from "react";
import {
  getTimeDifferenceInMinutes,
  getTimeUntilArrival
} from "../../util/timeUtils";

interface TimeDiffBadgeParams {
  estimatedArrivalTime: number;
  scheduledArrivalTime: number;
}

function TimeDiffBadge({
  estimatedArrivalTime,
  scheduledArrivalTime
}: TimeDiffBadgeParams) {
  const timeUntilArrival = getTimeUntilArrival(
    estimatedArrivalTime,
    scheduledArrivalTime
  );
  const hasEstimate = Number.isFinite(estimatedArrivalTime) && estimatedArrivalTime > 0;
  const hasSchedule = Number.isFinite(scheduledArrivalTime) && scheduledArrivalTime > 0;
  const difference = hasEstimate && hasSchedule
    ? getTimeDifferenceInMinutes(scheduledArrivalTime, moment(estimatedArrivalTime))
    : null;
  const status = !hasEstimate ? "Scheduled" : !hasSchedule ? "Estimated" :
    difference === 0 ? "On Time" : difference < 0 ? "Late" : "Early";
  const color = difference === null ? "neutral" :
    difference === 0 ? "success" : difference < 0 ? "danger" : "info";

  return (
    <Badge tone={color}>
      <span>
        {timeUntilArrival} | {status}
      </span>
    </Badge>
  );
}

export default TimeDiffBadge;
