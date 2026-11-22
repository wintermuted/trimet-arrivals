import { StopLocationIndicator as Indicator } from "@overworld/ui/transit";
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
      <Indicator locationId={locationId} />
    </Link>
  );
}
