import React, { useCallback } from "react";
import { Button } from "@wintermuted/ui-react";
import { PlannerPaths, type PlannerPathRequest, type PlannerPathsProps } from "@overworld/maps/planner";
import type { TripCorridor } from "@overworld/places/discovery";
import type { PlannerRouteColors } from "../../../api/trimet/plannerRouteColors";
import { loadPlannerPaths } from "../util/mapbox/plannerPaths";

type Props = Omit<PlannerPathsProps, "loadPaths" | "renderStatus"> & {
  routeColors?: PlannerRouteColors;
  onDiscoverPlaces?: (corridor: Pick<TripCorridor, "lines" | "incomplete">) => void;
};

export default function NearbyPlannerPaths({ routeColors, onDiscoverPlaces, ...props }: Props) {
  const loadPaths = useCallback<PlannerPathRequest>(
    (itineraries, signal, walking) => loadPlannerPaths(itineraries, signal, walking, routeColors),
    [routeColors],
  );
  return <PlannerPaths {...props} loadPaths={loadPaths} renderStatus={({ mapError, selectedPaths, incomplete }) => <>
    {mapError && <small role="alert">Trip paths could not be displayed.</small>}
    {onDiscoverPlaces && props.selected >= 0 && <div className="transit-planner-places">
      <Button size="sm" variant="secondary" disabled={!selectedPaths.length} onClick={() => onDiscoverPlaces({
        lines: selectedPaths.flatMap(({ geometry }) => geometry.type === "LineString" ? [geometry.coordinates] : geometry.coordinates),
        incomplete,
      })}>Places along this trip</Button>
      {!selectedPaths.length && <p role="status">Mapped trip geometry is not available yet. Walking-only trips need walking routes enabled.</p>}
    </div>}
  </>} />;
}
