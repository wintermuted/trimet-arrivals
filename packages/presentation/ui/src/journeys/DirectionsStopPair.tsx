import React from "react";
import FontAwesome from "react-fontawesome";
import "./ItineraryPresentation.scss";

export function EndpointMarker({ field }: { field: "from" | "to" }) {
  return (
    <span className={`transit-planner-endpoint-marker transit-planner-endpoint-marker--${field}`} aria-hidden="true">
      {field === "to" && <FontAwesome name="map-marker" />}
    </span>
  );
}

export function DirectionsStopPair({ from, to }: {
  from: React.ReactNode;
  to: React.ReactNode;
}) {
  return (
    <div className="transit-planner-leg-stops transit-planner-endpoint-pair transit-planner-endpoint-pair--rail">
      <div className="transit-planner-endpoint"><EndpointMarker field="from" />{from}</div>
      <div className="transit-planner-endpoint"><EndpointMarker field="to" />{to}</div>
    </div>
  );
}
