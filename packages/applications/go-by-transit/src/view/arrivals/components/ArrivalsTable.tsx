import React from "react";
import { ArrivalsTable as SharedArrivalsTable, type ArrivalsTableProps } from "@overworld/ui/transit";
import type { TrimetRoute } from "../../../api/trimet/interfaces/types";
import { formatArrivalDistance, renderArrivalRoute } from "./arrivalPresentation";

type Props = Omit<ArrivalsTableProps, "formatDistance" | "renderRouteIndicator"> & {
  onRouteIndicatorClick: (route: TrimetRoute) => void;
};

export default function ArrivalsTable({ onRouteIndicatorClick, ...props }: Props) {
  return <SharedArrivalsTable {...props} formatDistance={formatArrivalDistance} renderRouteIndicator={renderArrivalRoute} />;
}
