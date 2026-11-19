import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { getVehicleTrip, VehicleTripSnapshot } from "../api/trimet/vehicleTrip";
import { VehicleRequestError } from "../api/trimet/vehicles";
import { VehiclePosition } from "../api/trimet/interfaces/vehicles";
import FollowedVehicleTrip from "../view/nearby/components/FollowedVehicleTrip";
import { VehicleFeed } from "../view/nearby/util/useVehiclePositions";
import { VehicleFollowView } from "../view/nearby/util/mapbox/vehicleLayer";

jest.mock("../api/trimet/vehicleTrip", () => ({
  ...jest.requireActual("../api/trimet/vehicleTrip"), getVehicleTrip: jest.fn(),
}));

describe("following a vehicle's current run", () => {
  const now = 1800000000000;
  const selection: VehiclePosition = {
    id: "4003", type: "bus", tripId: "trip", blockId: "1547", routeNumber: 15,
    longitude: -122.68, latitude: 45.51, time: now, expires: now + 60000,
  };
  const snapshot = (passed = 1, progress = true): VehicleTripSnapshot => ({
    queryTime: Date.now(), partial: false,
    trip: {
      tripId: "trip", destination: "Gateway TC", progressAvailable: progress,
      stops: ["Alpha", "Bravo", "Charlie", "Delta"].map((name, index) => ({
        id: String(index + 1), name, sequence: index + 1,
        passed: index < passed, status: "normal", scheduled: now + index * 60000,
      })),
    },
  });
  let root: Root;
  let container: HTMLDivElement;
  let feed: VehicleFeed;
  let view: VehicleFollowView;
  const onViewChange = jest.fn();
  async function render() {
    await act(async () => { root.render(<FollowedVehicleTrip selection={selection} feed={feed}
      view={view} onViewChange={onViewChange} />); });
  }
  beforeEach(() => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(now);
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    feed = { vehicles: [selection], status: "current", updatedAt: now, rejected: 0 };
    view = "north-up";
    jest.mocked(getVehicleTrip).mockResolvedValue(snapshot());
    container = document.createElement("div");
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    jest.useRealTimers();
    Reflect.deleteProperty(document, "hidden");
  });

  it("lists actual stop-to-stop legs and advances the current leg with fresh reports", async () => {
    await render();
    expect(getVehicleTrip).toHaveBeenCalledWith("1547", "trip", expect.any(AbortSignal));
    expect(container.querySelector('[aria-current="step"]').textContent).toContain("Bravo");
    expect(container.querySelectorAll(".transit-follow-legs li")).toHaveLength(3);
    jest.setSystemTime(now + 15000);
    jest.mocked(getVehicleTrip).mockResolvedValue(snapshot(2));
    feed = { ...feed, updatedAt: now + 15000 };
    await render();
    expect(container.querySelector('[aria-current="step"]').textContent).toContain("Charlie");
    expect(container.querySelector("details").textContent).toContain("Passed");
    expect(container.textContent).toContain("Next stop: Charlie");
  });

  it("labels schedule-based progress instead of claiming observed passed stops", async () => {
    jest.mocked(getVehicleTrip).mockResolvedValue(snapshot(2, false));
    await render();
    expect(container.textContent).toContain("schedule-based");
    expect(container.textContent).toContain("Scheduled past");
    expect(container.querySelector('[aria-current="step"]')).toBeNull();
  });

  it("keeps last-known legs on failure and honors backoff while position polling continues", async () => {
    await render();
    jest.mocked(getVehicleTrip).mockRejectedValue(new VehicleRequestError("Throttled", false, 60000));
    jest.setSystemTime(now + 15000);
    feed = { ...feed, updatedAt: now + 15000 };
    await render();
    expect(container.textContent).toContain("could not be updated");
    expect(container.textContent).toContain("last report");
    expect(container.querySelector('[aria-current="step"]')).toBeNull();
    jest.setSystemTime(now + 30000);
    feed = { ...feed, updatedAt: now + 30000 };
    await render();
    expect(getVehicleTrip).toHaveBeenCalledTimes(2);
    jest.mocked(getVehicleTrip).mockResolvedValue(snapshot(2));
    await act(async () => { Array.from(container.querySelectorAll("button"))
      .find(button => button.textContent === "Retry trip progress").click(); });
    expect(getVehicleTrip).toHaveBeenCalledTimes(3);
  });

  it("does not follow a new trip automatically or pretend a lost vehicle is current", async () => {
    await render();
    feed = { ...feed, vehicles: [{ ...selection, tripId: "new-trip" }], updatedAt: now + 15000 };
    await render();
    expect(container.textContent).toContain("Tracking this trip has ended");
    expect(getVehicleTrip).toHaveBeenCalledTimes(1);
    feed = { ...feed, vehicles: [], status: "error" };
    await render();
    expect(container.textContent).toContain("Map following is paused");
    expect(container.querySelector('[aria-current="step"]')).toBeNull();
  });

  it("aborts trip-detail work when updates pause or the sidebar unmounts", async () => {
    jest.mocked(getVehicleTrip).mockImplementation(() => new Promise(() => {}));
    await render();
    const signal = jest.mocked(getVehicleTrip).mock.calls[0][2];
    feed = { ...feed, status: "paused" };
    await render();
    expect(signal.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("exposes pressed-state map views and explains missing headings without restarting trip requests", async () => {
    await render();
    const group = container.querySelector('[aria-label="Following map view"]');
    const [north, chase] = Array.from(group.querySelectorAll("button"));
    expect(north.getAttribute("aria-pressed")).toBe("true");
    expect(chase.getAttribute("aria-pressed")).toBe("false");
    act(() => chase.click());
    expect(onViewChange).toHaveBeenLastCalledWith("chase");
    view = "chase";
    await render();
    expect(chase.getAttribute("aria-pressed")).toBe("true");
    expect(container.textContent).toContain("Heading unavailable; holding the last orientation");
    expect(container.textContent).toContain("not continuous GPS");
    act(() => north.click());
    expect(onViewChange).toHaveBeenLastCalledWith("north-up");
    expect(getVehicleTrip).toHaveBeenCalledTimes(1);
  });
});
