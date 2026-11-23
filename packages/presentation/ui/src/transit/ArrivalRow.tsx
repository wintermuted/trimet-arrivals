import React from "react";
import type { TrimetRoute } from "@overworld/trimet-client";
import OnTimeIndicator from "../arrivalIndicator/OnTimeIndicator";
import TimeToArrivalIndicator from "../arrivalIndicator/TimeToArrivalIndicator";
import { useTimeDisplay } from "../TimeDisplay";
import "./Arrivals.css";

export interface ArrivalRowProps {
  scheduled: number;
  estimated: number;
  feet: number;
  routeId: number;
  shortSign: string;
  now: number;
  route?: TrimetRoute;
  renderRouteIndicator: (routeId: number, route?: TrimetRoute) => React.ReactNode;
  formatDistance: (feet: number) => string;
}

export default function ArrivalRow({
  scheduled,
  estimated,
  feet,
  routeId,
  shortSign,
  now,
  route,
  renderRouteIndicator,
  formatDistance,
}: ArrivalRowProps) {
  const { formatTime } = useTimeDisplay();

  return (
    <tr>
      <td className="route-indicator-column">
        {renderRouteIndicator(routeId, route)}
      </td>
      <td className="short-sign">{shortSign}</td>
      <td>
        <TimeToArrivalIndicator estimated={estimated} now={now} />
      </td>
      <td>
        <OnTimeIndicator
          scheduled={scheduled}
          estimated={estimated}
        />
      </td>
      <td className="estimated-scheduled-time">
        <small>Estimated / Scheduled</small>
        <br />
        {formatTime(estimated, undefined, true)} /{" "}
        {formatTime(scheduled, undefined, true)}
      </td>
      <td className="distance-in-miles">{formatDistance(feet)}</td>
    </tr>
  );
}
