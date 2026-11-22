import { vi, type MockedFunction } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useVehiclePositions, useVehicleTrip } from "./react";
import type { VehiclePositionRequest, VehicleTripRequest, VehicleViewport } from "./react";
import type { VehicleSnapshot } from "./interfaces/vehicles";
import type { VehicleTripSnapshot } from "./vehicleTrip";
import { VehicleRequestError } from "./vehicles";

describe("injected vehicle requests", () => {
  const now = 1800000000000;
  const vehicle = {
    id: "bus-1", type: "bus" as const, longitude: -122.68, latitude: 45.51,
    time: now, expires: now + 300000
  };
  const snapshot: VehicleSnapshot = { vehicles: [vehicle], queryTime: now, rejected: 0 };
  let move: () => void;
  let removed: () => void;
  let getVehicles: MockedFunction<VehiclePositionRequest>;
  let feed: ReturnType<typeof useVehiclePositions>;
  const unsubscribeMove = vi.fn();
  const unsubscribeRemove = vi.fn();
  const viewport: VehicleViewport = {
    getBounds: () => [-123, 45, -122, 46],
    subscribeMove(listener) { move = listener; return unsubscribeMove; },
    subscribeRemove(listener) { removed = listener; return unsubscribeRemove; }
  };
  function Harness({ vehicleId }: { vehicleId?: string }) {
    feed = useVehiclePositions(viewport, true, getVehicles, vehicleId);
    return <output>{feed.status}: {feed.vehicles.length}</output>;
  }
  async function advance(ms: number) {
    await act(async () => { vi.advanceTimersByTime(ms); });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    getVehicles = vi.fn().mockResolvedValue(snapshot);
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(document, "hidden");
  });

  it("cancels viewport work, rejects late results, and releases viewport subscriptions on removal", async () => {
    let finish: (value: VehicleSnapshot) => void;
    getVehicles.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<Harness />);
    const signal = getVehicles.mock.calls[0][1];
    act(() => move());
    expect(signal.aborted).toBe(true);
    await advance(250);
    expect(screen.getByText("current: 1")).toBeInTheDocument();
    await act(async () => { finish({ ...snapshot, vehicles: [] }); });
    expect(feed.vehicles).toEqual([vehicle]);
    act(() => removed());
    expect(unsubscribeMove).toHaveBeenCalled();
    expect(unsubscribeRemove).toHaveBeenCalled();
    await advance(60000);
    expect(getVehicles).toHaveBeenCalledTimes(2);
  });

  it("honors Retry-After independently of viewport movement and permits manual permanent-error retry", async () => {
    getVehicles.mockRejectedValueOnce(new VehicleRequestError("Throttled", false, 60000));
    await act(async () => { render(<Harness />); });
    expect(feed.status).toBe("error");
    act(() => move());
    await advance(59999);
    expect(getVehicles).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(feed.status).toBe("current");
    getVehicles.mockRejectedValue(new VehicleRequestError("Forbidden", true));
    await advance(15000);
    await advance(120000);
    expect(getVehicles).toHaveBeenCalledTimes(3);
    getVehicles.mockResolvedValue(snapshot);
    await act(async () => { feed.retry(); });
    expect(getVehicles).toHaveBeenCalledTimes(4);
  });

  it("requests a selected vehicle without viewport bounds or movement subscriptions", async () => {
    await act(async () => { render(<Harness vehicleId="bus-1" />); });
    expect(getVehicles).toHaveBeenCalledWith(undefined, expect.any(AbortSignal), "bus-1");
    expect(screen.getByText("current: 1")).toBeInTheDocument();
    expect(unsubscribeMove).not.toHaveBeenCalled();
    await advance(15000);
    expect(getVehicles).toHaveBeenCalledTimes(2);
  });
});

describe("injected trip progress requests", () => {
  let request: MockedFunction<VehicleTripRequest>;
  let trip: ReturnType<typeof useVehicleTrip>;
  const data: VehicleTripSnapshot = {
    queryTime: 1800000000000, partial: false,
    trip: { tripId: "trip", progressAvailable: true, stops: [] }
  };
  function Harness({ tripId = "trip", updatedAt = Date.now(), enabled = true }: {
    tripId?: string; updatedAt?: number; enabled?: boolean;
  }) {
    trip = useVehicleTrip("block", tripId, updatedAt, enabled, request);
    return <output>{trip.data?.trip?.tripId} {trip.error}</output>;
  }
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1800000000000);
    request = vi.fn().mockResolvedValue(data);
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(document, "hidden");
  });

  it("retains last-known progress on failure and applies request backoff until manual retry", async () => {
    const { rerender } = render(<Harness />);
    await act(async () => {});
    expect(trip.data).toBe(data);
    request.mockRejectedValueOnce(new VehicleRequestError("Throttled", false, 60000));
    vi.setSystemTime(1800000015000);
    await act(async () => { rerender(<Harness />); });
    expect(trip.error).toContain("could not be updated");
    expect(trip.data).toBe(data);
    vi.setSystemTime(1800000030000);
    rerender(<Harness />);
    expect(request).toHaveBeenCalledTimes(2);
    await act(async () => { trip.retry(); });
    expect(request).toHaveBeenCalledTimes(3);
    expect(trip.error).toBeUndefined();
  });

  it("aborts a changed trip and paused work, ignoring results from old requests", async () => {
    let finish: (value: VehicleTripSnapshot) => void;
    request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const { rerender, unmount } = render(<Harness />);
    const firstSignal = request.mock.calls[0][2];
    const next = { ...data, trip: { ...data.trip, tripId: "next" } };
    request.mockResolvedValue(next);
    await act(async () => { rerender(<Harness tripId="next" />); });
    expect(firstSignal.aborted).toBe(true);
    await act(async () => { finish(data); });
    expect(trip.data).toBe(next);
    const secondSignal = request.mock.calls[1][2];
    rerender(<Harness tripId="next" enabled={false} />);
    expect(secondSignal.aborted).toBe(true);
    unmount();
    act(() => vi.runAllTicks());
    expect(vi.getTimerCount()).toBe(0);
  });
});
