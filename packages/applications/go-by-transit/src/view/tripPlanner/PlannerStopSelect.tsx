import React from "react";
import { PlannerStopSelect as StopSelect, type CommonPlannerPlace, type PlannerStopSelectProps } from "@overworld/ui/transit";

export type { SavedPlannerStop } from "@overworld/ui/transit";

const COMMON_PLACES: readonly CommonPlannerPlace[] = [
  { id: 9650, label: "Washington Square Transit Center", aliases: ["Washington Square Mall", "Washington Sq"] },
  { id: 10120, label: "Oregon Zoo / Washington Park MAX Station", aliases: ["Zoo", "Washington Park MAX"] },
  { id: 10579, label: "Portland International Airport MAX Station", aliases: ["PDX"] },
];

export default function PlannerStopSelect(props: Omit<PlannerStopSelectProps, "commonPlaces">) {
  return <StopSelect {...props} commonPlaces={COMMON_PLACES} />;
}
