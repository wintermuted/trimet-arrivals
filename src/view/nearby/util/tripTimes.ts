import { Arrival } from "../../../api/trimet/interfaces/arrivals";

export interface StopTime {
  at: number;
  kind: "Estimated" | "Scheduled";
}

export interface TripTime {
  id: string;
  departure: StopTime;
  arrival?: StopTime;
  durationMs?: number;
}

function reportedTime(arrival: Arrival): StopTime | undefined {
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
    // A shared vehicle/block can run different trips; only match the same trip.
    const arrival = origin.tripID
      ? routeArrivals
        .filter(candidate => candidate.locid === to && candidate.tripID === origin.tripID)
        .map(reportedTime)
        .filter((time): time is StopTime => !!time && time.at >= departure.at)
        .sort((a, b) => a.at - b.at)[0]
      : undefined;
    trips.push({
      id: origin.id,
      departure,
      arrival,
      durationMs: arrival ? arrival.at - departure.at : undefined
    });
  });
  return trips.sort((a, b) => a.departure.at - b.departure.at);
}
