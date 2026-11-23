import cx from "classnames";
import React from "react";
import { TrimetRoute } from "../../../api/trimet/interfaces/types";
import { StopLocationWithDistance } from "../../../state/arrivals/formatStopLocations";
import StopBookmarkControlContainer from "../containers/StopBookmarkControlContainer";
import ReloadIntervalCoordinator from "./ReloadIntervalCoordinator";
import StopInfo from "./StopInfo";
import "./StopsTableHeader.css";

interface Props {
  stopLocation?: StopLocationWithDistance;
  refresh: () => void;
  nextRefreshAt: number | null;
  now: number;
  loading: boolean;
  showArrivals: boolean;
  onRouteIndicatorClick?: (route: TrimetRoute) => void;
  locationId: number;
}

export default function StopsTableHeader(props: Props) {
  const {
    stopLocation,
    loading,
    showArrivals,
    refresh,
    nextRefreshAt,
    now,
    onRouteIndicatorClick,
    locationId,
  } = props;

  if (!stopLocation) {
    return null;
  }

  const classNames = cx("nearbyStops-header", {
    "arrivals-hidden": !showArrivals,
  });

  return (
    <div className={classNames}>
      <StopInfo stopLocation={stopLocation} onClick={onRouteIndicatorClick} />
      <div className="stop-control-section">
        <StopBookmarkControlContainer
          locationId={locationId}
          stopLocation={stopLocation}
        />
        <ReloadIntervalCoordinator
          refresh={refresh}
          nextRefreshAt={nextRefreshAt}
          now={now}
          loading={loading}
          showArrivals={showArrivals}
        />
      </div>
    </div>
  );
}
