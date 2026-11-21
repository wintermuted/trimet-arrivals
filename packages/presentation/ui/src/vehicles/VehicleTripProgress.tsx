import { isVehicleTripStale, vehicleTripLegs } from "@trimet-arrivals/trimet-client";
import type { VehiclePosition, VehicleTripSnapshot, VehicleTripStop, VehicleTripProgressMode } from "@trimet-arrivals/trimet-client";
import React from "react";
import { Button } from "@wintermuted/ui-theme/react";
import { useTimeDisplay } from "../TimeDisplay";
import "./VehicleTripProgress.scss";

export interface VehicleTripProgressState {
  data?: VehicleTripSnapshot;
  receivedAt?: number;
  loading: boolean;
  error?: string;
  retry: () => void;
}

export interface VehicleTripProgressProps {
  selection: VehiclePosition;
  vehicle?: VehiclePosition;
  tracking: boolean;
  ended: boolean;
  paused: boolean;
  result: VehicleTripProgressState;
  view: "north-up" | "chase";
  onViewChange: (view: "north-up" | "chase") => void;
  header: React.ReactNode;
  sectionRef?: React.Ref<HTMLElement>;
  timeZone?: string;
}

export default function VehicleTripProgress({ selection, vehicle, tracking, ended, paused, result, view,
  onViewChange, header, sectionRef, timeZone }: VehicleTripProgressProps) {
  const { formatTime } = useTimeDisplay();
  const data = result.data;
  const trip = data?.trip;
  const stale = isVehicleTripStale(result.receivedAt, Date.now());
  const mode: VehicleTripProgressMode = trip?.progressAvailable
    ? tracking && !result.error && !stale && !paused ? "live" : "last-known" : "scheduled";
  const legs = trip ? vehicleTripLegs(trip, mode) : [];
  const next = trip?.stops.find(stop => !stop.passed && stop.status !== "canceled");
  const firstUpcoming = next ? Math.max(0, legs.findIndex(leg => leg.to.sequence >= next.sequence)) : legs.length;
  const earlier = legs.slice(0, firstUpcoming);
  const upcoming = legs.slice(firstUpcoming);

  function stopTime(stop: VehicleTripStop) {
    const time = stop.estimated ?? stop.scheduled;
    return time ? <>
      <time dateTime={new Date(time).toISOString()}>{formatTime(time, timeZone)}</time>
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

  return <section ref={sectionRef} className="transit-follow-trip" aria-label="Following vehicle trip">
    {header}
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
      {tracking && vehicle?.bearing === undefined && " Heading unavailable; holding the last orientation."}
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
      Trip progress updated {formatTime(result.receivedAt, timeZone, true)}
    </p>}
    {earlier.length > 0 && <details>
      <summary>{earlier.length} earlier {earlier.length === 1 ? "leg" : "legs"}{mode === "scheduled" ? " (schedule-based)" : ""}</summary>
      {legList(earlier, 1)}
    </details>}
    {legList(upcoming, earlier.length + 1)}
    {trip && legs.length === 0 && <p>No public stop-to-stop legs are available for this trip.</p>}
  </section>;
}
