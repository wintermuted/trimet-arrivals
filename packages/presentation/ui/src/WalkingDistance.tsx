import React from "react";
import "./WalkingDistance.scss";

export type WalkingDistanceEstimate =
  | { status: "ready"; meters: number; seconds: number }
  | { status: "unreachable" | "uncertain" };

export interface WalkingDistanceProps {
  enabled: boolean;
  loading?: boolean;
  estimate?: WalkingDistanceEstimate;
  straightLine: string;
  formatDistance: (meters: number) => string;
}

export function WalkingDistance({
  enabled,
  loading = false,
  estimate,
  straightLine,
  formatDistance,
}: WalkingDistanceProps) {
  if (enabled && estimate?.status === "ready") {
    return (
      <span className="transit-simple-route-distance">
        <span>{formatDistance(estimate.meters)} walk</span>
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
