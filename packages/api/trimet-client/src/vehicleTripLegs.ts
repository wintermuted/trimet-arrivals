import type { VehicleTrip } from "./vehicleTrip";

export type VehicleTripProgressMode = "live" | "last-known" | "scheduled";

export function vehicleTripLegs(trip: VehicleTrip, mode: VehicleTripProgressMode) {
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
