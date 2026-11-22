import React from "react";
import { ArrivalsTableLoadMore as SharedTable, type ArrivalsTableLoadMoreProps } from "@overworld/ui/transit";
import type { TrimetRoute } from "../../../api/trimet/interfaces/types";
import { formatArrivalDistance, renderArrivalRoute } from "./arrivalPresentation";

type Props = Omit<ArrivalsTableLoadMoreProps, "formatDistance" | "renderRouteIndicator"> & {
  onRouteIndicatorClick: (route: TrimetRoute) => void;
};

export default function ArrivalsTableLoadMore({ onRouteIndicatorClick, ...props }: Props) {
  return <SharedTable {...props} formatDistance={formatArrivalDistance} renderRouteIndicator={renderArrivalRoute} />;
}
