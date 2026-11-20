import moment, { Moment } from "moment";
import React from "react";
import { TrimetRoute } from "../../../api/trimet/interfaces/types";
import OnTimeIndicator from "../../../component/arrivalIndicator/OnTimeIndicator";
import TimeToArrivalIndicator from "../../../component/arrivalIndicator/TimeToArrivalIndicator";
import RouteIndicator from "../../../component/route/RouteIndicator";
import { useTimeDisplay } from "@trimet-arrivals/ui";
import { getDistanceUntilArrival } from "../util";
import "./Arrivals.css";

interface Props {
  scheduled: number;
  estimated: number;
  feet: number;
  routeId: number;
  shortSign: string;
  now: Moment;
  onRouteIndicatorClick: (route: TrimetRoute) => void;
  route: TrimetRoute;
}

export default function ArrivalRow({
  scheduled,
  estimated,
  feet,
  routeId,
  shortSign,
  now,
  route
}: Props) {
  const { formatTime } = useTimeDisplay();
  const scheduledMoment = moment(scheduled);
  const estimatedMoment = moment(estimated);
  const distance = getDistanceUntilArrival(feet);

  return (
    <tr>
      <td className="route-indicator-column">
        <RouteIndicator routeId={routeId} route={route} />
      </td>
      <td className="short-sign">{shortSign}</td>
      <td>
        <TimeToArrivalIndicator estimated={estimatedMoment} now={now} />
      </td>
      <td>
        <OnTimeIndicator
          scheduled={scheduledMoment}
          estimated={estimatedMoment}
        />
      </td>
      <td className="estimated-scheduled-time">
        <small>Estimated / Scheduled</small>
        <br />
        {formatTime(estimated, undefined, true)} /{" "}
        {formatTime(scheduled, undefined, true)}
      </td>
      <td className="distance-in-miles">{Math.round(distance)} miles</td>
    </tr>
  );
}
