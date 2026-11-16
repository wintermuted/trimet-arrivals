import React from "react";
import { WalkingEstimate } from "../../../../api/mapbox/walking";

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
  if (enabled && estimate?.status === "ready") {
    const feet = estimate.meters * 3.28084;
    const distance =
      feet < 5280 ? `${Math.round(feet)} ft` : `${(feet / 5280).toFixed(1)} mi`;
    return (
      <span className="transit-simple-route-distance">
        <span>{distance} walk</span>
        <small>
          {estimate.seconds < 60
            ? "Under 1 min"
            : `About ${Math.ceil(estimate.seconds / 60)} min`}
        </small>
      </span>
    );
  }
  return (
    <span className="transit-simple-route-distance">
      {enabled && (
        <span>
          {loading
            ? "Calculating walk..."
            : estimate?.status === "unreachable"
              ? "No walking route found"
              : "Walking distance unavailable"}
        </span>
      )}
      <small>{straightLine} (straight-line)</small>
    </span>
  );
}
