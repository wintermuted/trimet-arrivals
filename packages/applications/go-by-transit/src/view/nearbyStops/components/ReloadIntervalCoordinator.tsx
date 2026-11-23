import React from "react";
import ReloadButton from "../../../component/buttons/ReloadButton";
import "../../nearby/components/NearbyViewComponent.scss";

interface Props {
  refresh: () => void;
  nextRefreshAt: number | null;
  now: number;
  loading: boolean;
  showArrivals: boolean;
}

export default function ReloadIntervalCoordinator({
  refresh,
  nextRefreshAt,
  now,
  loading,
  showArrivals,
}: Props) {
  if (!showArrivals) return null;
  const seconds =
    nextRefreshAt === null
      ? 30
      : Math.max(0, Math.ceil((nextRefreshAt - now) / 1000));
  return (
    <div className="stops-reload-button">
      <ReloadButton disabled={loading} onClick={refresh}>
        <span className="count-down-label">{seconds}</span>
      </ReloadButton>
    </div>
  );
}
