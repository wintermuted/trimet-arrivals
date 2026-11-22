import React from "react";
import { ArrivalRow as SharedArrivalRow, type ArrivalRowProps } from "@overworld/ui/transit";
import type { TrimetRoute } from "../../../api/trimet/interfaces/types";
import { formatArrivalDistance, renderArrivalRoute } from "./arrivalPresentation";

type Props = Omit<ArrivalRowProps, "formatDistance" | "renderRouteIndicator"> & {
  onRouteIndicatorClick: (route: TrimetRoute) => void;
};

export default function ArrivalRow({ onRouteIndicatorClick, ...props }: Props) {
  return <SharedArrivalRow {...props} formatDistance={formatArrivalDistance} renderRouteIndicator={renderArrivalRoute} />;
}
