import { Button, Select } from "@wintermuted/ui-react";
import { MultiSelect } from "@wintermuted/ui-react/select";
import { join, map } from "lodash";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getArrivals } from "../../../api/trimet/arrivals";
import { ArrivalData } from "../../../api/trimet/interfaces/arrivals";
import { StopData } from "../../../api/trimet/interfaces/types";
import Loading from "../../loading/Loading";
import useStopHighlight from "../util/useStopHighlight";
import useWalkingEstimates from "../util/useWalkingEstimates";
import NearbyRouteControlPopover from "./NearbyRouteControlPopover";
import NearbySubNav from "./common/NearbySubNav";
import "./NearbyRoutes.scss";
import SimpleRouteGroups from "./SimpleRouteGroups";
import { filterRouteStructures, getRouteArrivals, getDisplayRoutes } from "./nearbyRouteArrivals";
import NearbyRouteInfo from "./NearbyRouteInfo";
import { TrimetRoute as DetailedRoute } from "../../../api/trimet/interfaces/routes";

export { filterRouteStructures, getRouteArrivals } from "./nearbyRouteArrivals";
export type { RouteStructure } from "./nearbyRouteArrivals";

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

interface FilterOption {
  label: string;
  value: string;
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

  const displayRoutes = getDisplayRoutes(filteredRoutes, sortBy, walkingEnabled);

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
            <SimpleRouteGroups
              displayRoutes={displayRoutes}
              currentLocation={currentLocation}
              walkingEnabled={walkingEnabled}
              walkingLoading={walking.status === "loading"}
              focusStop={focusStop}
              hoverStop={hoverStop}
              clearHighlight={clearHighlight}
              handleDisclosureToggle={handleDisclosureToggle}
              infoButton={infoButton}
              routeInfoSearch={routeInfoSearch}
            />
          )}
        </>
      )}
    </div>
    </div>
    </>
  );
}
