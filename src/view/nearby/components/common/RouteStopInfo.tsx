import { Button, Tooltip } from "@wintermuted/ui-theme/react";
import React from "react";
import FontAwesome from "react-fontawesome";
import { Link, useNavigate } from "react-router-dom";
import { StopLocation } from "../../../../api/trimet/interfaces/types";

interface StopInfoParams {
  shortSign: string;
  stopLocation: StopLocation;
}

export default function RouteStopInfo({ stopLocation }: StopInfoParams) {
  const navigate = useNavigate();

  function handleGoClick() {
    navigate("/nearby/directions?route=54&direction=1&from=1&to=2");
  }

  return (
    <div className="transit-stop-actions">
      <small>
        <strong>From: </strong>
        <Link to={`/nearby/stops/${stopLocation.id}`}>
          {stopLocation.desc} ({stopLocation.id})
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
