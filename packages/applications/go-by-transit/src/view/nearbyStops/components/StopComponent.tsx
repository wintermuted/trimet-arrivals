import { Button } from "@wintermuted/ui-react";
import React from "react";
import type { Arrival } from "../../../api/trimet/interfaces/arrivals";
import type { TrimetRoute } from "../../../api/trimet/interfaces/types";
import type { StopLocationWithDistance } from "../../../state/arrivals/formatStopLocations";
import ArrivalsComponent from "../../arrivals/components/ArrivalsComponent";
import "../../nearby/components/NearbyViewComponent.scss";
import StopsTableHeader from "./StopsTableHeader";

interface Props {
  stopLocation?: StopLocationWithDistance;
  locationId: number;
  loading: boolean;
  error?: string;
  arrivals?: Arrival[];
  refresh: () => void;
  nextRefreshAt: number | null;
  now: number;
  showArrivals: boolean;
  onRouteIndicatorClick?: (route: TrimetRoute) => void;
}

export default function StopComponent(props: Props) {
  const { error, loading, locationId, refresh, showArrivals } = props;
  return (
    <article className="stop">
      <StopsTableHeader {...props} />
      {loading && !props.stopLocation && (
        <p role="status">Loading stop {locationId}...</p>
      )}
      {error && (
        <div>
          <p role="alert">
            {error}
            {props.arrivals && " Showing the last received arrivals."}
          </p>
          <Button onClick={refresh} disabled={loading}>
            Try again
          </Button>
        </div>
      )}
      {showArrivals && <ArrivalsComponent {...props} />}
    </article>
  );
}
