import { Button, Tooltip } from "@wintermuted/ui-react";
import React from "react";
import FontAwesome from "react-fontawesome";
import { Link, useNavigate } from "react-router-dom";
import { StopLocation } from "../../../../api/trimet/interfaces/types";

interface StopInfoParams {
  shortSign: string;
  stopLocation: StopLocation;
  routeId: number;
  direction: number;
  showFromLabel?: boolean;
}

export default function RouteStopInfo({
  stopLocation,
  routeId,
  direction,
  showFromLabel = true
}: StopInfoParams) {
  const navigate = useNavigate();

  function handleGoClick() {
    const params = new URLSearchParams({
      route: String(routeId),
      direction: String(direction),
      from: String(stopLocation.id)
    });
    navigate(`/nearby/directions?${params}`);
  }

  return (
    <div className="transit-stop-actions">
      <small>
        {showFromLabel && <strong>From: </strong>}
        <Link to={`/nearby/stops/${stopLocation.id}`}>
          {showFromLabel ? `${stopLocation.desc} (${stopLocation.id})` : "View stop details"}
        </Link>
      </small>
      <div
        className="transit-stop-action-buttons"
        role="group"
        aria-label="Stop actions"
      >
        <Tooltip text="Go from this stop">
          <Button
            variant="primary"
            onClick={handleGoClick}
            aria-label="Go from this stop"
          >
            <FontAwesome name="location-arrow" aria-hidden="true" />
            Go
          </Button>
        </Tooltip>
        <Tooltip text="Bookmark this route">
          <Button variant="secondary" aria-label="Bookmark this route">
            <FontAwesome name="bookmark" aria-hidden="true" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
