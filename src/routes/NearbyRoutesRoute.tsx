import React from "react";
import { RouteDirectionDict } from "../store/reducers/util/getRoutesFromStopLocations";
import NearbyRoutes from "../view/stops/components/NearbyRoutes";

interface Props {
  nearbyRoutes: RouteDirectionDict;
}

export default function NearbyRoutesRoute({ nearbyRoutes }: Props) {
  return <NearbyRoutes nearbyRoutes={nearbyRoutes} />;
}