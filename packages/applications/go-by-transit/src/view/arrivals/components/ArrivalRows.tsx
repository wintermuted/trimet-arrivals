import React from "react";
import { ArrivalRows as SharedArrivalRows, type ArrivalRowsProps } from "@overworld/ui/transit";
import type { Arrival } from "../../../api/trimet/interfaces/arrivals";
import type { StopLocation, TrimetRoute } from "../../../api/trimet/interfaces/types";
import type { Moment } from "moment";
import { formatArrivalDistance, renderArrivalRoute } from "./arrivalPresentation";

type Props = Omit<ArrivalRowsProps, "formatDistance" | "renderRouteIndicator"> & {
  onClick: (route: TrimetRoute) => void;
};

export default class ArrivalRows extends React.Component<Props> {
  public static getRows(arrivals: Arrival[], now: Moment, onClick: Props["onClick"], stopLocation: StopLocation, showAllArrivals: boolean) {
    return SharedArrivalRows.getRows(arrivals, now, renderArrivalRoute, stopLocation, showAllArrivals, formatArrivalDistance);
  }

  public render() {
    const { onClick, ...props } = this.props;
    return <SharedArrivalRows {...props} formatDistance={formatArrivalDistance} renderRouteIndicator={renderArrivalRoute} />;
  }
}
