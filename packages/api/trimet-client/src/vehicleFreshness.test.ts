import { isVehicleTripStale, vehicleIsFresh } from "./vehicleFreshness";

it("requires a position younger than 90 seconds and an unexpired report", () => {
  const now = 200_000;
  expect(vehicleIsFresh({ expires: now + 1, time: now - 89_999 }, now)).toBe(true);
  expect(vehicleIsFresh({ expires: now + 1, time: now - 90_000 }, now)).toBe(false);
  expect(vehicleIsFresh({ expires: now, time: now - 1 }, now)).toBe(false);
});

it("treats a missing or 90-second-old trip update as stale", () => {
  const now = 200_000;
  expect(isVehicleTripStale(undefined, now)).toBe(true);
  expect(isVehicleTripStale(now - 89_999, now)).toBe(false);
  expect(isVehicleTripStale(now - 90_000, now)).toBe(true);
});
