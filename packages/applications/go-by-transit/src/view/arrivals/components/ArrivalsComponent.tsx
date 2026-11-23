import React from "react";
import { Arrival } from "../../../api/trimet/interfaces/arrivals";
import {
  StopLocation,
  TrimetRoute,
} from "../../../api/trimet/interfaces/types";
import "../Arrivals.css";
import ArrivalsTableLoadMore from "./ArrivalsTableLoadMore";

interface Props {
  loading: boolean;
  locationId: number;
  arrivals?: Arrival[];
  error?: string;
  showArrivals: boolean;
  now: number;
  stopLocation?: StopLocation;
  onRouteIndicatorClick?: (route: TrimetRoute) => void;
}

export default class ArrivalsComponent extends React.Component<Props> {
  public render() {
    const {
      arrivals,
      loading = true,
      showArrivals = true,
      now,
      onRouteIndicatorClick,
      stopLocation,
    } = this.props;

    return (
      <div className="arrivals-wrapper">
        {loading && showArrivals && !arrivals && (
          <p role="status">Loading arrivals...</p>
        )}
        {!loading &&
          !this.props.error &&
          showArrivals &&
          arrivals?.length === 0 && (
            <p className="no-arrivals">No arrivals available.</p>
          )}
        {showArrivals && arrivals && arrivals.length > 0 && (
          <ArrivalsTableLoadMore
            arrivals={arrivals}
            loading={loading}
            now={now}
            onRouteIndicatorClick={onRouteIndicatorClick}
            stopLocation={stopLocation}
          />
        )}
      </div>
    );
  }
}
