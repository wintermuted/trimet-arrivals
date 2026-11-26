import { WalkingDistance as SharedWalkingDistance } from "@overworld/ui";
import React from "react";
import type { WalkingEstimate } from "../../../../api/mapbox/walking";

function formatWalkingDistance(meters: number) {
  const feet = meters * 3.28084;
  return feet < 5280
    ? `${Math.round(feet)} ft`
    : `${(feet / 5280).toFixed(1)} mi`;
}

export function WalkingDistance({
  enabled,
  loading = false,
  estimate,
  straightLine,
}: {
  enabled: boolean;
  loading?: boolean;
  estimate?: WalkingEstimate;
  straightLine: string;
}) {
  return (
    <SharedWalkingDistance
      enabled={enabled}
      loading={loading}
      estimate={estimate}
      straightLine={straightLine}
      formatDistance={formatWalkingDistance}
    />
  );
}
