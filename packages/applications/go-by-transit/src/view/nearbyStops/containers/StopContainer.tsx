import React from "react";
import { TrimetRoute } from "../../../api/trimet/interfaces/types";
import { useStopArrivals } from "../../../state/arrivals/ArrivalsProvider";
import StopComponent from "../components/StopComponent";

interface Props {
  locationId: number;
  showArrivals: boolean;
  onRouteIndicatorClick?: (route: TrimetRoute) => void;
}

export default function StopContainer(props: Props) {
  const state = useStopArrivals(props.locationId, props.showArrivals);
  return <StopComponent {...props} {...state} />;
}
