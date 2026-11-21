import { vehicleTripLegs } from "./index";
import type { VehicleTrip } from "./vehicleTrip";

const trip: VehicleTrip = {
  tripId: "trip", progressAvailable: true,
  stops: ["Alpha", "Bravo", "Charlie", "Delta", "Echo"].map((name, index) => ({
    id: String(index + 1), name, sequence: index + 1,
    passed: index < 2, status: index === 2 ? "canceled" : "normal",
  })),
};

it.each([
  ["live", ["Passed", "Canceled stop", "Current leg", "Upcoming"], true],
  ["last-known", ["Passed (last report)", "Canceled stop", "Current at last report", "Upcoming"], false],
  ["scheduled", ["Scheduled past", "Canceled stop", "Next scheduled leg", "Upcoming"], false],
] as const)("derives actual adjacent legs and skips canceled stops for %s progress", (mode, statuses, current) => {
  const legs = vehicleTripLegs(trip, mode);
  expect(legs.map(leg => [leg.from.name, leg.to.name])).toEqual([
    ["Alpha", "Bravo"], ["Bravo", "Charlie"], ["Charlie", "Delta"], ["Delta", "Echo"],
  ]);
  expect(legs.map(leg => leg.status)).toEqual(statuses);
  expect(legs.map(leg => leg.current)).toEqual([false, false, current, false]);
  expect(legs.map(leg => leg.passed)).toEqual([true, false, false, false]);
});

it("returns no legs when fewer than two public stops are reported", () => {
  expect(vehicleTripLegs({ ...trip, stops: [] }, "live")).toEqual([]);
  expect(vehicleTripLegs({ ...trip, stops: trip.stops.slice(0, 1) }, "live")).toEqual([]);
});
