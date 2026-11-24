import React from "react";
import { Badge, ListGroup, ListItem } from "@wintermuted/ui-react";
import { faBus, faCableCar, faTrain, faTrainTram } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import FontAwesome from "react-fontawesome";
import { Link } from "react-router-dom";
import { PLANNER_BUS_COLOR } from "../../../api/trimet/plannerRouteColors";
import { stopMode } from "../../../api/trimet/stopCatalog";
import { TrimetRoute } from "../../../api/trimet/interfaces/types";
import { getNormalizedDistanceString } from "../util/turfUtils";
import { getTimeUntilArrival } from "../util/timeUtils";
import { WalkingDistance } from "./common/WalkingDistance";
import { getArrivalTime, getDisplayRoutes } from "./nearbyRouteArrivals";

const SERVICE_ICONS = {
  Bus: faBus,
  Rail: faTrain,
  Streetcar: faTrainTram,
  "Aerial tram": faCableCar
};

function ExploreRouteBadge({ route }: { route: TrimetRoute }) {
  const mode = stopMode(route);
  const isFx = /^\s*FX\s*\d+\b/i.test(route.desc);
  const color = mode === "Bus" && !isFx ? PLANNER_BUS_COLOR : undefined;

  return (
    <Badge className="transit-explore-route-badge" style={color ? {
      borderColor: color,
      backgroundColor: `color-mix(in srgb, ${color} 12%, var(--wm-color-surface-solid))`
    } : undefined}>
      {mode && <FontAwesomeIcon icon={SERVICE_ICONS[mode]} aria-hidden="true" />}
      <span className="wm-sr-only">{isFx ? "FX bus" : mode ? `${mode} route` : "Route"} </span>
      <strong>{route.route}</strong>
    </Badge>
  );
}
interface Props {
  displayRoutes: ReturnType<typeof getDisplayRoutes>;
  currentLocation: number[];
  walkingEnabled: boolean;
  walkingLoading: boolean;
  focusStop: (stopId?: number) => void;
  hoverStop: (stopId?: number) => void;
  clearHighlight: () => void;
  handleDisclosureToggle: React.ReactEventHandler<HTMLDetailsElement>;
  infoButton: React.RefObject<HTMLAnchorElement | null>;
  routeInfoSearch: (routeId: number) => string;
}

export default function SimpleRouteGroups({
  displayRoutes, currentLocation, walkingEnabled, walkingLoading,
  focusStop, hoverStop, clearHighlight, handleDisclosureToggle, infoButton, routeInfoSearch
}: Props) {
  return (
    <div
      className="transit-route-groups"
      role="group"
      aria-label="Nearby route arrivals"
    >
      {displayRoutes.map(({ route, routeName, directions }) => (
        <div key={route.route} className="transit-simple-route">
          <details
            className="transit-simple-route-group"
            onToggle={handleDisclosureToggle}
            aria-labelledby={`nearby-route-${route.route}`}
            open
          >
            <summary
              id={`nearby-route-${route.route}`}
              className="transit-simple-route-heading"
            >
              <FontAwesome name="caret-right" aria-hidden="true" />
              <ExploreRouteBadge route={route} />
              <span title={routeName}>{routeName}</span>
            </summary>
            {directions.map((direction) => (
              <details
                key={direction.key}
                className="transit-simple-route-direction"
                onToggle={handleDisclosureToggle}
                aria-labelledby={`nearby-direction-${direction.key}`}
                open
              >
                <summary id={`nearby-direction-${direction.key}`}>
                  <FontAwesome name="caret-right" aria-hidden="true" />
                  {direction.direction.desc}
                </summary>
                <ListGroup
                  aria-label={`Route ${route.route}, ${direction.direction.desc} stops`}
                >
                  {direction.stops.map(
                    ({ stop, arrivals, distanceMiles, walkingEstimate }) => {
                      const arrival = arrivals[0];
                      const arrivalTime = getArrivalTime(arrival);
                      const arrivalLabel = !arrival
                        ? "No arrivals reported"
                        : arrivalTime == null
                          ? "Time unavailable"
                          : getTimeUntilArrival(
                              arrival.estimated,
                              arrival.scheduled
                            );
                      const distanceLabel =
                        distanceMiles == null
                          ? "Distance unavailable"
                          : getNormalizedDistanceString(
                              currentLocation,
                              [stop.lng, stop.lat]
                            );

                      return (
                        <ListItem
                          key={stop.locid}
                          className="transit-simple-route-item"
                        >
                          <Link
                            className="transit-simple-route-stop"
                            data-stop-id={stop.locid}
                            onBlur={() => focusStop()}
                            onFocus={() => focusStop(stop.locid)}
                            onMouseEnter={() => hoverStop(stop.locid)}
                            onMouseLeave={() => hoverStop()}
                            to={`/nearby/simple-routes/${route.route}?stop=${stop.locid}&direction=${direction.direction.dir}`}
                          >
                            <span className="transit-simple-route-stop-name">
                              {stop.desc}
                              <small className="transit-simple-route-stop-id">Stop {stop.locid}</small>
                            </span>
                            <span className="transit-simple-route-arrivals">
                              <strong>{arrivalLabel}</strong>
                              <WalkingDistance
                                enabled={walkingEnabled}
                                loading={walkingLoading}
                                estimate={walkingEstimate}
                                straightLine={distanceLabel}
                              />
                            </span>
                            <span className="transit-simple-route-action">
                              View arrivals{" "}
                              <span aria-hidden="true">›</span>
                            </span>
                          </Link>
                        </ListItem>
                      );
                    }
                  )}
                </ListGroup>
              </details>
            ))}
          </details>
          <Link
            className="transit-simple-route-details-link"
            to={{ search: routeInfoSearch(route.route) }}
            aria-label={`View Route ${route.route} details`}
            title={`Route ${route.route} details`}
            onClick={(event) => {
              infoButton.current = event.currentTarget;
              clearHighlight();
            }}
          >
            <FontAwesome name="info-circle" aria-hidden="true" />
          </Link>
        </div>
      ))}
    </div>
  );
}
