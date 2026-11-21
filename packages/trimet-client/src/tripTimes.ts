import type { Arrival } from "./interfaces/arrivals";

export interface StopTime {
  at: number;
  kind: "Estimated" | "Scheduled";
}

export interface TripTime {
  id: string;
  tripId?: string;
  departure: StopTime;
  arrival?: StopTime;
  durationMs?: number;
}

export function reportedTime(arrival: Arrival): StopTime | undefined {
  if (arrival.status !== "estimated" && arrival.status !== "scheduled") {
    return undefined;
  }
  if (arrival.status === "estimated" &&
      Number.isFinite(arrival.estimated) && arrival.estimated > 0) {
    return { at: arrival.estimated, kind: "Estimated" };
  }
  if (Number.isFinite(arrival.scheduled) && arrival.scheduled > 0) {
    return { at: arrival.scheduled, kind: "Scheduled" };
  }
  return undefined;
}

export function getMatchingStopTime(
  origin: Arrival,
  arrivals: Arrival[],
  stopId: number
): StopTime | undefined {
  const departure = reportedTime(origin);
  if (!departure || !origin.tripID) return undefined;
  return arrivals
    .filter(candidate =>
      candidate.locid === stopId && candidate.tripID === origin.tripID &&
      candidate.route === origin.route && candidate.dir === origin.dir
    )
    .map(reportedTime)
    .filter((time): time is StopTime => !!time && time.at >= departure.at)
    .sort((a, b) => a.at - b.at)[0];
}

export function getTripTimes(
  arrivals: Arrival[],
  routeId: number,
  direction: number,
  from: number,
  to: number,
  now: number
): TripTime[] {
  const routeArrivals = arrivals.filter(
    arrival => arrival.route === routeId && arrival.dir === direction
  );
  const trips: TripTime[] = [];
  routeArrivals.forEach(origin => {
    if (origin.locid !== from || origin.dropOffOnly) {
      return;
    }
    const departure = reportedTime(origin);
    if (!departure || departure.at < now) {
      return;
    }
    const arrival = getMatchingStopTime(origin, routeArrivals, to);
    trips.push({
      id: origin.id,
      tripId: origin.tripID,
      departure,
      arrival,
      durationMs: arrival ? arrival.at - departure.at : undefined
    });
  });
  return trips.sort((a, b) => a.departure.at - b.departure.at);
}
