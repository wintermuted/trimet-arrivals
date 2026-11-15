import {
  Button,
  ListGroup,
  ListItem,
  Select,
} from "@wintermuted/ui-theme/react";
import { MultiSelect } from "@wintermuted/ui-theme/react/select";
import { each, filter, groupBy, join, map } from "lodash";
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getArrivals } from "../../../api/trimet/arrivals";
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
import NearbyRouteControlPopover from "./NearbyRouteControlPopover";
import NearbySubNav from "./common/NearbySubNav";
import "./NearbyRoutes.scss";
import { SearchRadiusSelection } from "./SearchRadiusSelection";

interface Props {
  nearbyStops: StopData;
  currentLocation: number[];
  radiusSize: number;
  handleSimpleRoutesOpened: () => void;
  handleRadiusSelectionChange: (e: any) => void;
  routeCount: number;
  stopCount: number;
}

interface RouteStop {
  stop: StopLocation;
  arrivals: Arrival[];
  distanceMiles?: number;
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
  currentLocation: number[]
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
        });
      });
    });
  });

  return Array.from(routeDirections, ([key, routeDirection]) => ({
    direction: routeDirection.direction,
    key,
    route: routeDirection.route,
    stops: Array.from(routeDirection.stops.values()).sort((a, b) => {
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
}: Props) {
  const [arrivalData, setArrivalData] = useState<ArrivalData>();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedFilterValues, setSelectedFilterValues] = useState<string[]>(
    []
  );
  const [selectedStopIds, setSelectedStopIds] = useState<Map<string, number>>(
    () => new Map()
  );
  const [sortBy, setSortBy] = useState<"arrival" | "distance" | "route">(
    "arrival"
  );

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
        ? getRouteArrivals(arrivalData, nearbyStops, currentLocation)
        : [],
    [arrivalData, nearbyStops, currentLocation]
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

  const displayRoutes = filteredRoutes
    .map((route) => {
      const selectedStopId = selectedStopIds.get(route.key);
      const selectedStop =
        route.stops.find((stop) => stop.stop.locid === selectedStopId) ||
        route.stops[0];
      return { route, selectedStop };
    })
    .sort((a, b) => {
      if (sortBy === "route") {
        return (
          a.route.route.route - b.route.route.route ||
          a.route.direction.desc.localeCompare(b.route.direction.desc)
        );
      }
      if (sortBy === "distance") {
        return (
          (a.selectedStop?.distanceMiles ?? Infinity) -
            (b.selectedStop?.distanceMiles ?? Infinity) ||
          a.route.route.route - b.route.route.route
        );
      }

      const aArrival = getArrivalTime(a.selectedStop?.arrivals[0]);
      const bArrival = getArrivalTime(b.selectedStop?.arrivals[0]);
      return (
        (aArrival ?? Infinity) - (bArrival ?? Infinity) ||
        (a.selectedStop?.distanceMiles ?? Infinity) -
          (b.selectedStop?.distanceMiles ?? Infinity) ||
        a.route.route.route - b.route.route.route
      );
    });

  function changeSelectedStop(routeKey: string, value: string) {
    setSelectedStopIds((previous) => {
      const next = new Map(previous);
      next.set(routeKey, Number(value));
      return next;
    });
  }

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

  function handleStopSelectionChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const routeKey = event.currentTarget.dataset.routeKey;
    if (routeKey) {
      changeSelectedStop(routeKey, event.currentTarget.value);
    }
  }

  return (
    <div id="nearby-view-routes" className="scrollarea">
      <SearchRadiusSelection
        radiusSize={radiusSize}
        handleRadiusSelectionChange={handleRadiusSelectionChange}
      />
      <br />
      <NearbySubNav routeCount={routeCount} stopCount={stopCount} />
      <br />
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
                    ? "Nearest stop"
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
                  <option value="distance">Nearest stop</option>
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
              <Button
                type="button"
                variant="link"
                onClick={handleRetry}
              >
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
              <Button
                type="button"
                variant="link"
                onClick={handleClearFilters}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <ListGroup aria-label="Nearby route arrivals">
              {displayRoutes.map(({ route, selectedStop }) => {
                if (!selectedStop) {
                  return null;
                }

                const stop = selectedStop.stop;
                const arrival = selectedStop.arrivals[0];
                const arrivalTime = getArrivalTime(arrival);
                const arrivalLabel = !arrival
                  ? "No arrivals reported"
                  : arrivalTime == null
                    ? "Time unavailable"
                    : getTimeUntilArrival(arrival.estimated, arrival.scheduled);
                const distanceLabel =
                  selectedStop.distanceMiles == null
                    ? "Distance unavailable"
                    : getNormalizedDistanceString(currentLocation, [
                        stop.lng,
                        stop.lat,
                      ]);
                const arrivalLink =
                  `/nearby/simple-routes/${route.route.route}` +
                  `?stop=${stop.locid}&direction=${route.direction.dir}`;

                return (
                  <ListItem
                    key={route.key}
                    className="transit-simple-route-item"
                  >
                    <div className="transit-simple-route-content">
                      <div className="transit-simple-route-heading">
                        <Link
                          to={`/lines/${route.route.route}`}
                          aria-label={`View Route ${route.route.route} details`}
                        >
                          Route {route.route.route}
                        </Link>
                        <span>{route.direction.desc}</span>
                      </div>
                      <Link
                        className="transit-simple-route-arrivals"
                        to={arrivalLink}
                      >
                        <span>
                          {stop.desc} ({stop.locid})
                        </span>
                        <strong>{arrivalLabel}</strong>
                      </Link>
                      <span className="transit-simple-route-distance">
                        {distanceLabel}
                      </span>
                      {route.stops.length > 1 && (
                        <label className="transit-stop-selection">
                          Choose a stop
                          <Select
                            aria-label={`Stop for Route ${route.route.route}, ${route.direction.desc}`}
                            value={String(stop.locid)}
                            data-route-key={route.key}
                            onChange={handleStopSelectionChange}
                          >
                            {route.stops.map((routeStop) => (
                              <option
                                key={routeStop.stop.locid}
                                value={String(routeStop.stop.locid)}
                              >
                                {routeStop.stop.desc} ({routeStop.stop.locid})
                              </option>
                            ))}
                          </Select>
                        </label>
                      )}
                    </div>
                  </ListItem>
                );
              })}
            </ListGroup>
          )}
        </>
      )}
    </div>
  );
}
