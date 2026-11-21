import { useWalkingEstimates as useEstimates } from "@trimet-arrivals/routing/react";
import type { WalkingEstimateInput } from "@trimet-arrivals/routing/react";
import { getWalkingEstimates } from "../../../api/mapbox/walking";

export default function useWalkingEstimates(
  origin: number[],
  stops: WalkingEstimateInput[],
  enabled: boolean
) {
  return useEstimates(origin, stops, enabled, getWalkingEstimates);
}
