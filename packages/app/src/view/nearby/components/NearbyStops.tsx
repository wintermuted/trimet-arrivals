import {
  Badge,
  Button,
  Card,
  CardFooter,
  CardHeader,
  ListGroup,
  ListItem
} from "@wintermuted/ui-theme/react";
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  StopData,
  StopLocation,
  TrimetRoute
} from "../../../api/trimet/interfaces/types";
import RouteIndicator from "../../../component/route/RouteIndicator";
import Loading from "../../loading/Loading";
import { getNormalizedDistanceString } from "../util/turfUtils";
import useStopHighlight from "../util/useStopHighlight";
import useWalkingEstimates from "../util/useWalkingEstimates";
import NearbySubNav from "./common/NearbySubNav";
import { WalkingDistance } from "./common/WalkingDistance";
import "./NearbyViewComponent.scss";

function getRouteDirections(route: TrimetRoute, stop: StopLocation) {
  return route.dir.map(direction => (
    <ListItem
      key={`${route.route}-${direction.dir}`}
      className="transit-nearby-stop-route"
    >
      <span className="transit-nearby-stop-route-description">
        <RouteIndicator routeId={route.route} /> {direction.desc}
      </span>
      <Link
        className="wm-btn wm-btn-primary transit-nearby-stop-route-go"
        to={`/nearby/directions?route=${route.route}&direction=${direction.dir}&from=${stop.locid}`}
        aria-label={`Go on route ${route.route}, ${direction.desc}, from ${stop.desc} (${stop.locid})`}
      >
        Go
      </Link>
    </ListItem>
  ));
}

export interface NearbyStopsProps {
  nearbyStops: StopData;
  radiusSize: number;
  handleRadiusSelectionChange: (e: any) => void;
  stopCount: number;
  routeCount: number;
  currentLocation: number[];
  onStopHighlightChanged?: (stopId?: number) => void;
  walkingEnabled?: boolean;
}

export default function NearbyStops({
  nearbyStops,
  radiusSize,
  handleRadiusSelectionChange,
  routeCount,
  stopCount,
  currentLocation,
  onStopHighlightChanged,
  walkingEnabled = false
}: NearbyStopsProps) {
  const { clearHighlight, focusStop, hoverStop } = useStopHighlight(
    onStopHighlightChanged
  );
  const walking = useWalkingEstimates(
    currentLocation,
    nearbyStops?.location ?? [],
    walkingEnabled
  );

  useEffect(() => {
    clearHighlight();
  }, [nearbyStops, radiusSize, walkingEnabled, walking.status, clearHighlight]);

  if (!nearbyStops) {
    return <Loading />;
  }

  const stopLocations = [...nearbyStops.location];
  if (walkingEnabled && walking.status === "ready") {
    stopLocations.sort((first, second) => {
      const firstEstimate = walking.estimates.get(first.locid);
      const secondEstimate = walking.estimates.get(second.locid);
      const firstDistance =
        firstEstimate?.status === "ready" ? firstEstimate.meters : Infinity;
      const secondDistance =
        secondEstimate?.status === "ready" ? secondEstimate.meters : Infinity;
      return firstDistance - secondDistance || first.locid - second.locid;
    });
  }

  return (
    <div className="stops-wrapper scrollarea">
      <NearbySubNav routeCount={routeCount} stopCount={stopCount} />
      <br />
      {!walkingEnabled && (
        <p>
          Enable walking estimates in Feature flags to sort by walking distance.
        </p>
      )}
      {walkingEnabled && walking.status === "loading" && (
        <p role="status">Calculating walking distances...</p>
      )}
      {walkingEnabled && walking.status === "error" && (
        <div role="alert">
          <p>
            Walking estimates unavailable. {walking.error} Stops are not ranked
            by walking distance.
          </p>
          <Button variant="secondary" onClick={walking.refresh}>
            Retry walking estimates
          </Button>
        </div>
      )}
      {walkingEnabled && walking.status === "ready" && (
        <>
          <p role="status">Closest walk first; unavailable estimates last.</p>
          <Button variant="link" onClick={walking.refresh}>
            Refresh walking estimates
          </Button>
        </>
      )}
      {stopLocations.map((stopLocation: StopLocation) => (
        <React.Fragment key={stopLocation.locid}>
          <Card
            data-stop-id={stopLocation.locid}
            onMouseEnter={() => hoverStop(stopLocation.locid)}
            onMouseLeave={() => hoverStop()}
            onFocusCapture={() => focusStop(stopLocation.locid)}
            onBlurCapture={event => {
              if (
                !(event.relatedTarget instanceof Node) ||
                !event.currentTarget.contains(event.relatedTarget)
              ) {
                focusStop();
              }
            }}
          >
            <CardHeader as="h6" className="transit-nearby-stop-heading">
              <Link
                className="transit-nearby-stop-heading-link"
                to={`/nearby/stops/${stopLocation.locid}`}
              >
                <span className="transit-nearby-stop-name">
                  {stopLocation.desc}
                </span>
                <span className="transit-nearby-stop-id">
                  <Badge>{stopLocation.locid}</Badge>
                </span>
              </Link>
            </CardHeader>
            <ListGroup>
              {stopLocation.route.map(r => getRouteDirections(r, stopLocation))}
            </ListGroup>
            <CardFooter style={{ color: "var(--wm-color-text-muted)" }}>
              <WalkingDistance
                enabled={walkingEnabled}
                loading={walking.status === "loading"}
                estimate={walking.estimates.get(stopLocation.locid)}
                straightLine={getNormalizedDistanceString(currentLocation, [
                  stopLocation.lng,
                  stopLocation.lat
                ])}
              />
            </CardFooter>
          </Card>
          <br />
        </React.Fragment>
      ))}
    </div>
  );
}
