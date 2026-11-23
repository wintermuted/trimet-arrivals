import {
  Button,
  Card,
  CardHeader,
  ListGroup,
  ListItem,
} from "@wintermuted/ui-react";
import { MultiSelect } from "@wintermuted/ui-react/select";
import { Dictionary } from "lodash";
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Direction, TrimetRoute } from "../../../api/trimet/interfaces/types";
import RouteIndicator from "../../../component/route/RouteIndicator";
import NearbyRouteControlPopover from "./NearbyRouteControlPopover";
import NearbySubNav from "./common/NearbySubNav";
import "./NearbyRoutes.scss";

interface RouteDirection {
  key: string;
  routeId: number;
  direction: Direction;
}

interface RouteGroup {
  routeId: number;
  description: string;
  directions: RouteDirection[];
}

interface FilterOption {
  label: string;
  value: string;
}

function getRouteGroups(routes: Dictionary<TrimetRoute[]>): RouteGroup[] {
  return Object.values(routes || {})
    .filter((group) => group?.length > 0)
    .map((group) => {
      const routeId = group[0].route;
      const directions = new Map<string, RouteDirection>();

      group.forEach((route) =>
        (route.dir || []).forEach((direction) => {
          const key = `${route.route}-${direction.dir}`;
          if (!directions.has(key)) {
            directions.set(key, {
              direction,
              key,
              routeId: route.route,
            });
          }
        })
      );

      return {
        description: group[0].desc,
        directions: Array.from(directions.values()).sort(
          (a, b) =>
            a.direction.desc.localeCompare(b.direction.desc) ||
            a.direction.dir - b.direction.dir
        ),
        routeId,
      };
    })
    .sort((a, b) => a.routeId - b.routeId);
}

export function filterRouteGroups(
  groups: RouteGroup[],
  selectedValues: string[]
): Array<RouteGroup & { visibleDirections: RouteDirection[] }> {
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

  return groups
    .map((group) => {
      const routeSelected = selectedRoutes.has(String(group.routeId));
      const visibleDirections =
        selectedValues.length === 0 || routeSelected
          ? group.directions
          : group.directions.filter((direction) =>
              selectedDirections.has(direction.key)
            );
      return { ...group, visibleDirections };
    })
    .filter((group) => group.visibleDirections.length > 0);
}

export interface NearbyRoutesProps {
  nearbyRoutes: Dictionary<TrimetRoute[]>;
  radiusSize: number;
  handleRadiusSelectionChange: (e: any) => void;
  routeCount: number;
  stopCount: number;
}

export default function NearbyRoutes({
  nearbyRoutes,
  radiusSize,
  handleRadiusSelectionChange,
  routeCount,
  stopCount,
}: NearbyRoutesProps) {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const isLoading = nearbyRoutes == null;
  const routeGroups = useMemo(
    () => getRouteGroups(nearbyRoutes),
    [nearbyRoutes]
  );

  const routeOptions: FilterOption[] = routeGroups.map((group) => ({
    label: `Route ${group.routeId} — ${group.description}`,
    value: `route:${group.routeId}`,
  }));
  const directionOptions: FilterOption[] = routeGroups.flatMap((group) =>
    group.directions.map((direction) => ({
      label: `Route ${group.routeId} — ${direction.direction.desc}`,
      value: `direction:${direction.key}`,
    }))
  );
  const filterOptions = [
    { label: "Routes", options: routeOptions },
    { label: "Directions", options: directionOptions },
  ];
  const availableValues = new Set(
    filterOptions.flatMap((group) =>
      group.options.map((option) => option.value)
    )
  );
  const activeValues = selectedValues.filter((value) =>
    availableValues.has(value)
  );
  const filteredGroups = filterRouteGroups(routeGroups, activeValues);

  function handleFilterChange(selected: readonly FilterOption[]) {
    setSelectedValues(selected.map((option) => option.value));
  }

  function handleClearFilters() {
    setSelectedValues([]);
  }

  return (
    <div id="nearby-view-routes" className="scrollarea">
      <NearbySubNav routeCount={routeCount} stopCount={stopCount} />
      <br />
      <div className="transit-route-controls">
        <NearbyRouteControlPopover
          icon="filter"
          activeCount={activeValues.length}
          buttonLabel={
            activeValues.length > 0
              ? `Filter (${activeValues.length})`
              : "Filter"
          }
          disabled={isLoading || routeGroups.length === 0}
          label="Route filters"
        >
          <label
            className="transit-route-filter-label"
            htmlFor="nearby-routes-filter"
          >
            Filter by route or direction
          </label>
          <MultiSelect<FilterOption>
            id="nearby-routes-filter"
            aria-label="Filter by route or direction"
            className="transit-route-filter"
            options={filterOptions}
            value={filterOptions
              .flatMap((group) => group.options)
              .filter((option) => activeValues.includes(option.value))}
            onChange={handleFilterChange}
            placeholder="All nearby routes"
            isDisabled={isLoading || routeGroups.length === 0}
          />
          {activeValues.length > 0 && (
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
      </div>
      {isLoading ? (
        <p role="status">Loading nearby routes…</p>
      ) : routeGroups.length === 0 ? (
        <p role="status" className="transit-route-list-message">
          No routes were found within this search area.
        </p>
      ) : filteredGroups.length === 0 ? (
        <p role="status" className="transit-route-list-message">
          No nearby routes match these filters.
        </p>
      ) : (
        <div className="transit-route-groups">
          {filteredGroups.map((group) => (
            <Card key={group.routeId}>
              <CardHeader as="h5" className="transit-route-card-header">
                <Link
                  to={`/lines/${group.routeId}`}
                  aria-label={`View Route ${group.routeId} details`}
                >
                  <RouteIndicator routeId={group.routeId} linked={false} />
                  <span>{group.description}</span>
                </Link>
              </CardHeader>
              <ListGroup>
                {group.visibleDirections.map(({ key, routeId, direction }) => (
                  <ListItem key={key}>
                    <Link
                      className="transit-route-direction-link"
                      to={`/nearby/simple-routes/${routeId}?direction=${direction.dir}`}
                    >
                      <RouteIndicator routeId={routeId} linked={false} />
                      <span>{direction.desc}</span>
                      <span className="transit-route-direction-action">
                        View arrivals
                      </span>
                    </Link>
                  </ListItem>
                ))}
              </ListGroup>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
