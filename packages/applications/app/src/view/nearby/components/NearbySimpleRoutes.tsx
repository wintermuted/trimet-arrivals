import {
  Badge,
  Button,
  ListGroup,
  ListItem,
  Select,
} from "@wintermuted/ui-theme/react";
import { faBus, faCableCar, faTrain, faTrainTram } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { MultiSelect } from "@wintermuted/ui-theme/react/select";
import { each, filter, groupBy, join, map } from "lodash";
import React, { useEffect, useMemo, useRef, useState } from "react";
import FontAwesome from "react-fontawesome";
import { Link, useSearchParams } from "react-router-dom";
import { getArrivals } from "../../../api/trimet/arrivals";
import { PLANNER_BUS_COLOR } from "../../../api/trimet/plannerRouteColors";
import { stopMode } from "../../../api/trimet/stopCatalog";
import { WalkingEstimate } from "../../../api/mapbox/walking";
import { Arrival, ArrivalData } from "../../../api/trimet/interfaces/arrivals";
import {
  Direction,
  StopData,
  StopLocation,
  TrimetRoute,
} from "../../../api/trimet/interfaces/types";
import Loading from "../../loading/Loading";
import { getNormalizedDistanceString, getDistance } from "../util/turfUtils";
import { getTimeUntilArrival } from "../util/timeUtils";
import useStopHighlight from "../util/useStopHighlight";
import useWalkingEstimates from "../util/useWalkingEstimates";
import { WalkingDistance } from "./common/WalkingDistance";
import NearbyRouteControlPopover from "./NearbyRouteControlPopover";
import NearbySubNav from "./common/NearbySubNav";
import "./NearbyRoutes.scss";
import NearbyRouteInfo from "./NearbyRouteInfo";
import { TrimetRoute as DetailedRoute } from "../../../api/trimet/interfaces/routes";

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
  nearbyStops: StopData;
  currentLocation: number[];
  radiusSize: number;
  handleSimpleRoutesOpened: () => void;
  handleRadiusSelectionChange: (e: any) => void;
  routeCount: number;
  stopCount: number;
  onStopHighlightChanged?: (stopId?: number) => void;
  walkingEnabled?: boolean;
  onRouteInfoChanged?: (route: DetailedRoute, onError: () => void) => () => void;
  onRouteInfoStopHighlighted?: (stopId?: number) => void;
}

interface RouteStop {
  stop: StopLocation;
  arrivals: Arrival[];
  distanceMiles?: number;
  walkingEstimate?: WalkingEstimate;
}

function stopDistance(stop: RouteStop, walking: boolean) {
  return walking
    ? stop.walkingEstimate?.status === "ready" ? stop.walkingEstimate.meters : Infinity
    : stop.distanceMiles ?? Infinity;
}

function getRouteName(route: TrimetRoute): string {
  const prefix = `${route.route}-`;
  return route.desc.startsWith(prefix)
    ? route.desc.slice(prefix.length).trimStart()
    : route.desc;
}

export interface RouteStructure {
  key: string;
  route: TrimetRoute;
  direction: Direction;
  stops: RouteStop[];
}

interface FilterOption {
  label: string;
  value: string;
}

function getArrivalTime(arrival?: Arrival): number | undefined {
  if (!arrival) {
    return undefined;
  }
  const timestamp = arrival.estimated || arrival.scheduled;
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : undefined;
}

function hasCurrentLocation(currentLocation: number[]): boolean {
  return Boolean(
    currentLocation?.length >= 2 &&
    Number.isFinite(currentLocation[0]) &&
    Number.isFinite(currentLocation[1])
  );
}

export function getRouteArrivals(
  arrivalData: ArrivalData,
  nearbyStops: StopData,
  currentLocation: number[],
  walkingEstimates?: ReadonlyMap<number, WalkingEstimate>
): RouteStructure[] {
  const arrivalsByLocation = groupBy(arrivalData?.arrival || [], "locid");
  const routeDirections = new Map<
    string,
    {
      route: TrimetRoute;
      direction: Direction;
      stops: Map<number, RouteStop>;
    }
  >();
  const locationIsAvailable = hasCurrentLocation(currentLocation);

  each(nearbyStops?.location || [], (stop: StopLocation) => {
    if (stop.locid == null) {
      return;
    }

    each(stop.route || [], (route: TrimetRoute) => {
      each(route.dir || [], (direction: Direction) => {
        const key = `${route.route}-${direction.dir}`;
        let routeDirection = routeDirections.get(key);
        if (!routeDirection) {
          routeDirection = {
            direction,
            route,
            stops: new Map<number, RouteStop>(),
          };
          routeDirections.set(key, routeDirection);
        }

        const stopArrivals = filter(
          arrivalsByLocation[stop.locid],
          (arrival: Arrival) =>
            arrival.route === route.route && arrival.dir === direction.dir
        ).sort(
          (a, b) =>
            (getArrivalTime(a) ?? Infinity) - (getArrivalTime(b) ?? Infinity)
        );
        const stopHasCoordinates =
          Number.isFinite(stop.lng) && Number.isFinite(stop.lat);

        routeDirection.stops.set(stop.locid, {
          arrivals: stopArrivals,
          distanceMiles:
            locationIsAvailable && stopHasCoordinates
              ? getDistance(currentLocation, [stop.lng, stop.lat])
              : undefined,
          stop,
          walkingEstimate: walkingEstimates?.get(stop.locid),
        });
      });
    });
  });

  return Array.from(routeDirections, ([key, routeDirection]) => ({
    direction: routeDirection.direction,
    key,
    route: routeDirection.route,
    stops: Array.from(routeDirection.stops.values()).sort((a, b) => {
      if (walkingEstimates) {
        return stopDistance(a, true) - stopDistance(b, true) ||
          Number(a.stop.locid) - Number(b.stop.locid);
      }
      if (a.distanceMiles != null && b.distanceMiles != null) {
        return (
          a.distanceMiles - b.distanceMiles ||
          Number(a.stop.locid) - Number(b.stop.locid)
        );
      }
      return Number(a.stop.locid) - Number(b.stop.locid);
    }),
  })).sort(
    (a, b) =>
      a.route.route - b.route.route ||
      a.direction.desc.localeCompare(b.direction.desc) ||
      a.direction.dir - b.direction.dir
  );
}

export function filterRouteStructures(
  routes: RouteStructure[],
  selectedValues: string[]
): RouteStructure[] {
  if (selectedValues.length === 0) {
    return routes;
  }

  const selectedRoutes = new Set(
    selectedValues
      .filter((value) => value.startsWith("route:"))
      .map((value) => value.slice("route:".length))
  );
  const selectedDirections = new Set(
    selectedValues
      .filter((value) => value.startsWith("direction:"))
      .map((value) => value.slice("direction:".length))
  );

  return routes.filter(
    (route) =>
      selectedRoutes.has(String(route.route.route)) ||
      selectedDirections.has(route.key)
  );
}

export default function NearbySimpleRoutes({
  nearbyStops,
  currentLocation,
  radiusSize,
  handleRadiusSelectionChange,
  handleSimpleRoutesOpened,
  routeCount,
  stopCount,
  onStopHighlightChanged,
  walkingEnabled = false,
  onRouteInfoChanged,
  onRouteInfoStopHighlighted,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const routeValues = searchParams.getAll("route");
  const routeValue = routeValues[0];
  const parsedRoute = /^\d+$/.test(routeValue || "") ? Number(routeValue) : NaN;
  const infoRouteId = routeValues.length === 1 && Number.isSafeInteger(parsedRoute) && parsedRoute > 0
    ? parsedRoute : undefined;
  const invalidRoute = routeValues.length > 0 && infoRouteId === undefined;
  const infoButton = useRef<HTMLAnchorElement>(null);
  const [arrivalData, setArrivalData] = useState<ArrivalData>();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedFilterValues, setSelectedFilterValues] = useState<string[]>(
    []
  );
  const [sortBy, setSortBy] = useState<"arrival" | "distance" | "route">(
    "arrival"
  );
  const { clearHighlight, focusStop, hoverStop } = useStopHighlight(onStopHighlightChanged);
  const walking = useWalkingEstimates(currentLocation, nearbyStops?.location ?? [], walkingEnabled);

  useEffect(() => {
    clearHighlight();
  }, [nearbyStops, isLoading, selectedFilterValues, sortBy, clearHighlight]);

  function handleDisclosureToggle(event: React.SyntheticEvent<HTMLDetailsElement>) {
    if (!event.currentTarget.open) {
      clearHighlight();
    }
  }

  useEffect(() => {
    let active = true;

    async function fetchData() {
      setIsLoading(true);
      setLoadError(false);
      setArrivalData(undefined);

      if (!nearbyStops) {
        return;
      }

      handleSimpleRoutesOpened();

      if (!nearbyStops.location?.length) {
        setArrivalData({
          arrival: [],
          detour: [],
          location: [],
          queryTime: "",
        });
        setIsLoading(false);
        return;
      }

      const locationIds = join(
        map(nearbyStops.location, (location) => location.locid),
        ","
      );

      try {
        const arrivals = await getArrivals(locationIds, 90);
        if (active) {
          setArrivalData(arrivals);
          setIsLoading(false);
        }
      } catch {
        if (active) {
          setLoadError(true);
          setIsLoading(false);
        }
      }
    }

    void fetchData();
    return () => {
      active = false;
    };
  }, [nearbyStops, retryCount]);

  const routeStructures = useMemo(
    () =>
      arrivalData
        ? getRouteArrivals(arrivalData, nearbyStops, currentLocation,
            walkingEnabled ? walking.estimates : undefined)
        : [],
    [arrivalData, nearbyStops, currentLocation, walkingEnabled, walking.estimates]
  );

  const routeOptions: FilterOption[] = Array.from(
    new Map(
      routeStructures.map((route) => [
        String(route.route.route),
        {
          label: `Route ${route.route.route} — ${route.route.desc}`,
          value: `route:${route.route.route}`,
        },
      ])
    ).values()
  );
  const directionOptions: FilterOption[] = routeStructures.map((route) => ({
    label: `Route ${route.route.route} — ${route.direction.desc}`,
    value: `direction:${route.key}`,
  }));
  const filterOptions = [
    { label: "Routes", options: routeOptions },
    { label: "Directions", options: directionOptions },
  ];
  const availableFilterValues = new Set(
    filterOptions.flatMap((group) =>
      group.options.map((option) => option.value)
    )
  );
  const activeFilterValues = selectedFilterValues.filter((value) =>
    availableFilterValues.has(value)
  );
  const filteredRoutes = filterRouteStructures(
    routeStructures,
    activeFilterValues
  );

  const groupedRoutes = new Map<number, RouteStructure[]>();
  filteredRoutes.forEach((route) => {
    const directions = groupedRoutes.get(route.route.route) || [];
    directions.push(route);
    groupedRoutes.set(route.route.route, directions);
  });
  const displayRoutes = Array.from(groupedRoutes.values())
    .map((directions) => ({
      directions,
      distance: Math.min(
        ...directions.flatMap((direction) =>
          direction.stops.map((stop) => stopDistance(stop, walkingEnabled))
        )
      ),
      nextArrival: Math.min(
        ...directions.flatMap((direction) =>
          direction.stops.map(
            (stop) => getArrivalTime(stop.arrivals[0]) ?? Infinity
          )
        )
      ),
      route: directions[0].route,
      routeName: getRouteName(directions[0].route),
    }))
    .sort((a, b) => {
      if (sortBy === "route") {
        return a.route.route - b.route.route;
      }
      if (sortBy === "distance") {
        return a.distance - b.distance || a.route.route - b.route.route;
      }

      return (
        a.nextArrival - b.nextArrival ||
        a.distance - b.distance ||
        a.route.route - b.route.route
      );
    });

  function handleFilterChange(selected: readonly FilterOption[]) {
    setSelectedFilterValues(selected.map((option) => option.value));
  }

  function handleSortChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.currentTarget.value;
    if (value === "arrival" || value === "distance" || value === "route") {
      setSortBy(value);
    }
  }

  function handleRetry() {
    setRetryCount((count) => count + 1);
  }

  function handleClearFilters() {
    setSelectedFilterValues([]);
  }

  function closeRouteInfo() {
    const next = new URLSearchParams(searchParams);
    next.delete("route");
    setSearchParams(next, { replace: true });
    requestAnimationFrame(() => infoButton.current?.focus());
  }

  function routeInfoSearch(routeId: number) {
    const next = new URLSearchParams(searchParams);
    next.set("route", String(routeId));
    return `?${next.toString()}`;
  }

  return (
    <>
    {infoRouteId !== undefined && (
      <NearbyRouteInfo
        key={infoRouteId}
        routeId={infoRouteId}
        onMapChanged={onRouteInfoChanged}
        onStopHighlightChanged={onRouteInfoStopHighlighted}
        onClose={closeRouteInfo}
      />
    )}
    {invalidRoute && (
      <section className="transit-destination-panel" aria-label="Route details" onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          closeRouteInfo();
        }
      }}>
        <p role="alert">Invalid route number in the link.</p>
        <Button autoFocus variant="secondary" onClick={closeRouteInfo}>Close</Button>
      </section>
    )}
    <div hidden={infoRouteId !== undefined || invalidRoute}>
    <div id="nearby-view-routes" className="scrollarea transit-explore-routes">
      <NearbySubNav routeCount={routeCount} stopCount={stopCount} />
      {walkingEnabled && walking.status === "loading" && (
        <p role="status">Calculating walking distances...</p>
      )}
      {walkingEnabled && walking.status === "error" && (
        <div role="alert">
          <p>Walking estimates unavailable. {walking.error} Straight-line distances are labeled below.</p>
          <Button variant="secondary" onClick={walking.refresh}>Retry walking estimates</Button>
        </div>
      )}
      {walkingEnabled && walking.status === "ready" && (
        <Button variant="link" onClick={walking.refresh}>Refresh walking estimates</Button>
      )}
      {!nearbyStops ? (
        <Loading />
      ) : (
        <>
          <div className="transit-route-controls">
            <NearbyRouteControlPopover
              icon="filter"
              activeCount={activeFilterValues.length}
              buttonLabel={
                activeFilterValues.length > 0
                  ? `Filter (${activeFilterValues.length})`
                  : "Filter"
              }
              disabled={isLoading || routeStructures.length === 0}
              label="Route filters"
            >
              <label
                className="transit-route-filter-label"
                htmlFor="nearby-route-filter"
              >
                Filter by route or direction
              </label>
              <MultiSelect<FilterOption>
                id="nearby-route-filter"
                aria-label="Filter by route or direction"
                className="transit-route-filter"
                options={filterOptions}
                value={filterOptions
                  .flatMap((group) => group.options)
                  .filter((option) =>
                    activeFilterValues.includes(option.value)
                  )}
                onChange={handleFilterChange}
                placeholder="All nearby routes"
                isDisabled={isLoading || routeStructures.length === 0}
              />
              {activeFilterValues.length > 0 && (
                <Button
                  type="button"
                  variant="link"
                  className="transit-route-filter-clear"
                  onClick={handleClearFilters}
                >
                  Clear filters
                </Button>
              )}
            </NearbyRouteControlPopover>
            <NearbyRouteControlPopover
              icon="sort-amount-asc"
              buttonLabel={`Sort: ${
                sortBy === "arrival"
                  ? "Soonest arrival"
                  : sortBy === "distance"
                    ? `Nearest stop (${walkingEnabled ? "walking" : "straight-line"})`
                    : "Route number"
              }`}
              label="Route sorting"
            >
              <div className="transit-route-sort">
                <label htmlFor="nearby-route-sort">Sort by</label>
                <Select
                  id="nearby-route-sort"
                  value={sortBy}
                  onChange={handleSortChange}
                >
                  <option value="arrival">Soonest arrival</option>
                  <option value="distance">Nearest stop ({walkingEnabled ? "walking" : "straight-line"})</option>
                  <option value="route">Route number</option>
                </Select>
              </div>
            </NearbyRouteControlPopover>
          </div>
          {isLoading ? (
            <p role="status">Loading nearby route arrivals…</p>
          ) : loadError ? (
            <div role="alert" className="transit-route-list-message">
              <p>Nearby arrivals could not be loaded.</p>
              <Button type="button" variant="link" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          ) : !nearbyStops.location?.length ? (
            <p role="status" className="transit-route-list-message">
              No stops were found within this search area.
            </p>
          ) : routeStructures.length === 0 ? (
            <p role="status" className="transit-route-list-message">
              No routes were found within this search area.
            </p>
          ) : filteredRoutes.length === 0 ? (
            <div className="transit-route-list-message">
              <p role="status">No nearby routes match these filters.</p>
              <Button type="button" variant="link" onClick={handleClearFilters}>
                Clear filters
              </Button>
            </div>
          ) : (
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
                                        loading={walking.status === "loading"}
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
          )}
        </>
      )}
    </div>
    </div>
    </>
  );
}
