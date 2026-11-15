import React from "react";
import FontAwesome from "react-fontawesome";
import { RouteDataDictionary } from "../../../store/reducers/data/routeDataReducer";
import { getAerialTram, getRoutes } from "./AllLines";

export function AerialTram({ routes }: { routes: RouteDataDictionary }) {
  const aerialTram = getAerialTram(routes);

  return (
    <div className="line-detail-view-wrapper">
      <h2>
        <FontAwesome name="tram" className="tram" />
        OHSU Aerial Tram
      </h2>
      {getRoutes(aerialTram)}
    </div>
  );
}
