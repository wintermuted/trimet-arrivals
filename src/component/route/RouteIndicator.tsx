import { Badge } from "@wintermuted/ui-theme/react";
import React from "react";
import FontAwesome from "react-fontawesome";
import { Link } from "react-router-dom";
import { ROUTE_DISPLAY } from "../../api/trimet/constants";
import { TrimetRoute } from "../../api/trimet/interfaces/types";
import "./RouteIndicator.scss";

const DEFAULT_ROUTE_COLOR = "3D8FAE";

interface Props {
  routeId: number;
  route?: TrimetRoute;
  verbose?: boolean;
  routeColor?: string;
  linked?: boolean;
}

function getRouteDisplay(routeId: number, verboseRouteDisplay: boolean) {
  const routeFound = ROUTE_DISPLAY[routeId];

  if (!routeFound) {
    if (routeId) {
      return (
        <Badge tone="neutral">
          <FontAwesome name="bus" />
          <span>
            {routeId} {verboseRouteDisplay && "Bus"}
          </span>
        </Badge>
      );
    }
    return routeId || "-";
  } else {
    return (
      <Badge tone="neutral">
        <FontAwesome name="train" />
        <span className="route-indicator-text">{routeFound}</span>
      </Badge>
    );
  }
}

export default function RouteIndicator({
  routeColor = DEFAULT_ROUTE_COLOR,
  routeId,
  verbose,
  linked = true
}: Props) {
  const display = getRouteDisplay(routeId, verbose);
  if (!linked) {
    return <>{display}</>;
  }
  return (
    <Link to={`/lines/${routeId}`} className="transit-route-link">
      {display}
    </Link>
  );
}
