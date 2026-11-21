import React, { useEffect, useRef } from "react";
import { VehicleTripProgress } from "@trimet-arrivals/ui/vehicles";
import { ROUTE_DISPLAY } from "../../../api/trimet/constants";
import type { VehiclePosition } from "../../../api/trimet/interfaces/vehicles";
import type { VehicleFeed } from "../util/useVehiclePositions";
import { useVehicleTrip } from "../util/useVehicleTrip";
import type { VehicleFollowView } from "../util/mapbox/vehicleLayer";
import { TopNavBar } from "./common/TopNavBar";

export { vehicleTripLegs } from "@trimet-arrivals/trimet-client";

export default function FollowedVehicleTrip({ selection, feed, view, onViewChange, backTo, onBack }: {
  selection: VehiclePosition;
  feed: VehicleFeed;
  view: VehicleFollowView;
  onViewChange: (view: VehicleFollowView) => void;
  backTo: string;
  onBack: () => void;
}) {
  const vehicle = feed.vehicles.find(entry => entry.id === selection.id);
  const ended = Boolean(vehicle?.tripId && vehicle.tripId !== selection.tripId);
  const tracking = Boolean(vehicle && vehicle.tripId === selection.tripId);
  const result = useVehicleTrip(selection.blockId || "", selection.tripId || "", feed.updatedAt,
    tracking && !ended && feed.status !== "paused" && Boolean(selection.blockId && selection.tripId));
  const name = ROUTE_DISPLAY[selection.routeNumber] || (selection.routeNumber ? `Route ${selection.routeNumber}` : "Vehicle");
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    section.current?.querySelector<HTMLElement>(".transit-detail-back")?.focus({ preventScroll: true });
  }, [selection.id, selection.tripId]);
  return <VehicleTripProgress selection={selection} vehicle={vehicle} tracking={tracking} ended={ended}
    paused={feed.status === "paused"} result={result} view={view} onViewChange={onViewChange}
    sectionRef={section} timeZone="America/Los_Angeles"
    header={<TopNavBar id={`Following ${name}`} backTo={backTo} onBack={onBack} />}
  />;
}
