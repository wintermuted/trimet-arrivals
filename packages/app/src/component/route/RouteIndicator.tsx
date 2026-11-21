import React from "react";
import { RouteIndicator as Indicator } from "@trimet-arrivals/ui/transit";
import { Link } from "react-router-dom";
import { ROUTE_DISPLAY } from "../../api/trimet/constants";
import { TrimetRoute } from "../../api/trimet/interfaces/types";
import "./RouteIndicator.scss";

interface Props {
  routeId: number;
  route?: TrimetRoute;
  verbose?: boolean;
  routeColor?: string;
  linked?: boolean;
}

export default function RouteIndicator({
  routeId,
  verbose,
  linked = true
}: Props) {
  const display = <Indicator routeId={routeId} routeLabel={ROUTE_DISPLAY[routeId]} verbose={verbose} />;
  if (!linked) {
    return <>{display}</>;
  }
  return (
    <Link to={`/lines/${routeId}`} className="transit-route-link">
      {display}
    </Link>
  );
}
