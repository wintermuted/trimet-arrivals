import { Badge } from "@wintermuted/ui-theme/react";
import React from "react";
import { Link } from "react-router-dom";

interface Props {
  locationId: number;
  nearbyStops?: boolean;
}

export default function StopLocationIndicator({
  locationId,
  nearbyStops
}: Props) {
  const route = nearbyStops
    ? `/nearby/stops/${locationId}`
    : `/stop/${locationId}`;

  return (
    <Link to={route}>
      <Badge>{locationId}</Badge>
    </Link>
  );
}
