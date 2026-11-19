import React from "react";
import { Button } from "@wintermuted/ui-theme/react";
import { ROUTE_DISPLAY } from "../../../api/trimet/constants";
import { VehiclePosition } from "../../../api/trimet/interfaces/vehicles";
import { VehicleTrip, VehicleTripStop } from "../../../api/trimet/vehicleTrip";
import { useTimeDisplay } from "../../../component/time/TimeDisplay";
import { VehicleFeed } from "../util/useVehiclePositions";
import { useVehicleTrip } from "../util/useVehicleTrip";
import { VehicleFollowView } from "../util/mapbox/vehicleLayer";
import { TopNavBar } from "./common/TopNavBar";

type ProgressMode = "live" | "last-known" | "scheduled";

export function vehicleTripLegs(trip: VehicleTrip, mode: ProgressMode) {
  const next = trip.stops.findIndex(stop => !stop.passed && stop.status !== "canceled");
  return trip.stops.slice(1).map((to, index) => ({
    from: trip.stops[index], to,
    passed: to.passed && to.status !== "canceled",
    current: index + 1 === next && mode === "live",
    status: to.status === "canceled" ? "Canceled stop" :
      to.passed ? mode === "live" ? "Passed" : mode === "last-known" ? "Passed (last report)" : "Scheduled past" :
        index + 1 === next ? mode === "live" ? "Current leg" : mode === "last-known" ? "Current at last report" : "Next scheduled leg" :
          "Upcoming",
  }));
}

export default function FollowedVehicleTrip({ selection, feed, view, onViewChange, onBack }: {
  selection: VehiclePosition;
  feed: VehicleFeed;
  view: VehicleFollowView;
  onViewChange: (view: VehicleFollowView) => void;
  onBack: () => void;
}) {
  const vehicle = feed.vehicles.find(entry => entry.id === selection.id);
  const ended = Boolean(vehicle?.tripId && vehicle.tripId !== selection.tripId);
  const tracking = Boolean(vehicle && vehicle.tripId === selection.tripId);
  const result = useVehicleTrip(
    selection.blockId || "", selection.tripId || "", feed.updatedAt,
    tracking && !ended && feed.status !== "paused" && Boolean(selection.blockId && selection.tripId)
  );
  const { formatTime } = useTimeDisplay();
  const data = result.data;
  const trip = data?.trip;
  const stale = !result.receivedAt || Date.now() - result.receivedAt >= 90000;
  const mode: ProgressMode = trip?.progressAvailable
    ? tracking && !result.error && !stale && feed.status !== "paused" ? "live" : "last-known" : "scheduled";
  const legs = trip ? vehicleTripLegs(trip, mode) : [];
  const next = trip?.stops.find(stop => !stop.passed && stop.status !== "canceled");
  const firstUpcoming = next ? Math.max(0, legs.findIndex(leg => leg.to.sequence >= next.sequence)) : legs.length;
  const earlier = legs.slice(0, firstUpcoming);
  const upcoming = legs.slice(firstUpcoming);
  const name = ROUTE_DISPLAY[selection.routeNumber] || (selection.routeNumber ? `Route ${selection.routeNumber}` : "Vehicle");

  function stopTime(stop: VehicleTripStop) {
    const time = stop.estimated ?? stop.scheduled;
    return time ? <>
      <time dateTime={new Date(time).toISOString()}>{formatTime(time, "America/Los_Angeles")}</time>
      <small>{stop.estimated ? mode === "live" ? "Estimated" : "Last estimate" : "Scheduled"}</small>
    </> : <small>Time not reported</small>;
  }

  function legList(entries: typeof legs, start: number) {
    return <ol className="transit-follow-legs" start={start}>
      {entries.map(leg => <li key={`${leg.from.sequence}-${leg.to.sequence}`}
        className={leg.current ? "transit-follow-leg-current" : undefined}
        aria-current={leg.current ? "step" : undefined}>
        <strong className="transit-follow-leg-status">{leg.status}</strong>
        <div className="transit-follow-stop-pair">
          <div><span>{leg.from.name}</span><small>Stop {leg.from.id}</small>{stopTime(leg.from)}</div>
          <div><span>{leg.to.name}</span><small>Stop {leg.to.id}</small>{stopTime(leg.to)}</div>
        </div>
        {leg.to.status === "dropOffOnly" && <small>Drop-off only</small>}
        {!["normal", "canceled", "dropOffOnly"].includes(leg.to.status) && <small>Stop status: {leg.to.status}</small>}
      </li>)}
    </ol>;
  }

  return <section className="transit-follow-trip" aria-label="Following vehicle trip">
    <TopNavBar id={`Following ${name}`} onBack={onBack} />
    <p>{selection.type === "bus" ? "Bus" : "Train"} {selection.id} · Trip {selection.tripId || "not reported"}</p>
    <p>{trip?.destination ? `To ${trip.destination}` : selection.destination}</p>
    <div role="group" aria-label="Following map view" className="transit-follow-view-controls">
      <Button type="button" size="sm" variant={view === "north-up" ? "primary" : "secondary"}
        aria-pressed={view === "north-up"} onClick={() => onViewChange("north-up")}>North-up</Button>
      <Button type="button" size="sm" variant={view === "chase" ? "primary" : "secondary"}
        aria-pressed={view === "chase"} onClick={() => onViewChange("chase")}>Chase view</Button>
    </div>
    {view === "chase" && <p className="transit-trip-note">
      3D view follows reported headings, not continuous GPS.
      {tracking && vehicle.bearing === undefined && " Heading unavailable; holding the last orientation."}
    </p>}
    <p role="status">{ended ? "This vehicle is now serving another trip. Tracking this trip has ended." :
      !tracking ? "Waiting for a fresh vehicle position. Map following is paused." :
        mode === "scheduled" ? "Stop progress is schedule-based; live stop progress is unavailable." :
          mode === "last-known" ? "Showing the last reported trip progress." :
            next ? `Next stop: ${next.name}` : "All reported stops have been passed."}</p>
    {result.loading && !data && tracking && <p role="status">Loading trip legs...</p>}
    {result.error && <div role="alert">
      <p>{result.error} Any displayed legs are from the last successful update.</p>
      <Button type="button" size="sm" disabled={!tracking || ended} onClick={result.retry}>Retry trip progress</Button>
    </div>}
    {data && !trip && <p role="status">This trip is no longer reported for the selected vehicle block.</p>}
    {data?.partial && <p role="status">Some stop names are unavailable; stop IDs are shown instead.</p>}
    {result.receivedAt && <p className="transit-trip-note">
      Trip progress updated {formatTime(result.receivedAt, "America/Los_Angeles", true)}
    </p>}
    {earlier.length > 0 && <details>
      <summary>{earlier.length} earlier {earlier.length === 1 ? "leg" : "legs"}{mode === "scheduled" ? " (schedule-based)" : ""}</summary>
      {legList(earlier, 1)}
    </details>}
    {legList(upcoming, earlier.length + 1)}
    {trip && legs.length === 0 && <p>No public stop-to-stop legs are available for this trip.</p>}
  </section>;
}
