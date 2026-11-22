import { vi } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { Map as MapboxMap } from "mapbox-gl";
import { getVehicles, VehicleRequestError } from "../api/trimet/vehicles";
import { VehicleSnapshot } from "../api/trimet/interfaces/vehicles";
import { useVehiclePositions } from "../view/nearby/util/useVehiclePositions";

vi.mock("../api/trimet/vehicles", async () => ({
  ...(await vi.importActual<typeof import("../api/trimet/vehicles")>("../api/trimet/vehicles")),
  getVehicles: vi.fn(),
}));

const now = 1800000000000;
const vehicle = { id: "bus-1", type: "bus" as const, longitude: -122.68, latitude: 45.51, time: now, expires: now + 300000 };
const snapshot = (): VehicleSnapshot => ({ vehicles: [{ ...vehicle, time: Date.now() }], queryTime: Date.now(), rejected: 0 });
const get = vi.mocked(getVehicles);

describe("vehicle viewport polling", () => {
  let root: Root;
  let container: HTMLDivElement;
  let hidden = false;
  let feed: ReturnType<typeof useVehiclePositions>;
  const handlers = new Map<string, () => void>();
  const originalHidden = Object.getOwnPropertyDescriptor(document, "hidden");
  const map = {
    on: vi.fn((name, handler) => { handlers.set(name, handler); }),
    off: vi.fn((name, handler) => { if (handlers.get(name) === handler) handlers.delete(name); }),
    getBounds: vi.fn(() => ({
      getWest: () => -123, getSouth: () => 45, getEast: () => -122, getNorth: () => 46,
    })),
  };
  function Harness({ enabled = true, ready = true, vehicleId = undefined }) {
    feed = useVehiclePositions(ready ? map as MapboxMap : undefined, enabled, vehicleId);
    return <span>{feed.status}</span>;
  }
  async function render(enabled = true, ready = true, vehicleId?: string) {
    await act(async () => { root.render(<Harness enabled={enabled} ready={ready} vehicleId={vehicleId} />); });
  }
  async function advance(ms: number) {
    await act(async () => { vi.advanceTimersByTime(ms); });
  }
  async function visibility(value: boolean) {
    hidden = value;
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    await advance(0);
  }
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.clearAllMocks();
    handlers.clear();
    map.on.mockImplementation((name, handler) => { handlers.set(name, handler); });
    map.off.mockImplementation((name, handler) => { if (handlers.get(name) === handler) handlers.delete(name); });
    map.getBounds.mockReturnValue({
      getWest: () => -123, getSouth: () => 45, getEast: () => -122, getNorth: () => 46,
    });
    hidden = false;
    Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
    get.mockImplementation(async () => snapshot());
    container = document.createElement("div");
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    if (originalHidden) Object.defineProperty(document, "hidden", originalHidden);
    else Reflect.deleteProperty(document, "hidden");
  });

  it("waits for readiness, fetches viewport bounds, polls after completion and clears on disable", async () => {
    await render(true, false);
    expect(get).not.toHaveBeenCalled();
    await render();
    expect(get.mock.calls[0][0]).toEqual([-123, 45, -122, 46]);
    expect(feed.status).toBe("current");
    await advance(14999);
    expect(get).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(get).toHaveBeenCalledTimes(2);
    await render(false);
    expect(feed.vehicles).toEqual([]);
    await advance(60000);
    expect(get).toHaveBeenCalledTimes(2);
    expect(handlers.has("moveend")).toBe(false);
  });

  it("does not overlap interval requests and discards late results after a viewport change", async () => {
    let resolve: (value: VehicleSnapshot) => void;
    get.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    await render();
    const signal = get.mock.calls[0][1];
    await advance(15000);
    expect(get).toHaveBeenCalledTimes(1);
    await act(async () => { handlers.get("moveend")(); handlers.get("moveend")(); });
    expect(signal.aborted).toBe(true);
    await advance(250);
    expect(get).toHaveBeenCalledTimes(2);
    await act(async () => { resolve({ ...snapshot(), vehicles: [] }); });
    expect(feed.vehicles).toHaveLength(1);
  });

  it("pauses hidden tabs, aborts work, and refreshes on resume", async () => {
    await render();
    await visibility(true);
    expect(feed.status).toBe("paused");
    expect(get.mock.calls[0][1].aborted).toBe(true);
    await advance(60000);
    expect(get).toHaveBeenCalledTimes(1);
    await visibility(false);
    expect(get).toHaveBeenCalledTimes(2);
    expect(feed.status).toBe("current");
  });

  it("expires reports during an outage and honors Retry-After even when the map moves", async () => {
    await render();
    get.mockRejectedValue(new VehicleRequestError("Throttled", false, 120000));
    await advance(15000);
    expect(feed.status).toBe("error");
    await act(async () => { handlers.get("moveend")(); });
    await advance(75000);
    expect(get).toHaveBeenCalledTimes(2);
    expect(feed.vehicles).toEqual([]);
    await advance(45000);
    expect(get).toHaveBeenCalledTimes(3);
  });

  it("stops automatic retries for permanent errors but permits a manual retry", async () => {
    get.mockRejectedValue(new VehicleRequestError("Forbidden", true));
    await render();
    await advance(120000);
    expect(get).toHaveBeenCalledTimes(1);
    get.mockImplementation(async () => snapshot());
    await act(async () => { feed.retry(); });
    expect(get).toHaveBeenCalledTimes(2);
    expect(feed.status).toBe("current");
  });

  it("keeps newer observations, removes absent IDs, and distinguishes partial/stale from empty", async () => {
    await render();
    get.mockResolvedValue({ queryTime: now + 15000, vehicles: [{ ...vehicle, time: now - 1000, longitude: -120 }], rejected: 1 });
    await advance(15000);
    expect(feed.vehicles[0].longitude).toBe(-122.68);
    expect(feed.status).toBe("delayed");
    get.mockResolvedValue({ queryTime: now + 30000, vehicles: [], rejected: 0 });
    await advance(15000);
    expect(feed.status).toBe("empty");
    expect(feed.vehicles).toEqual([]);
  });

  it("times out stalled requests and cleans all timers and listeners on unmount", async () => {
    get.mockImplementation((_bounds, signal) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    await render();
    await advance(20000);
    expect(feed.status).toBe("error");
    expect(feed.message).toContain("timed out");
    await render(false);
    // React 19 queues microtasks that Jest's fake timers also count.
    act(() => vi.runAllTicks());
    expect(vi.getTimerCount()).toBe(0);
    expect(handlers.size).toBe(0);
  });

  it("tracks a selected vehicle outside the viewport without feedback from camera move events", async () => {
    await render(true, true, "bus-1");
    expect(get).toHaveBeenCalledWith(undefined, expect.any(AbortSignal), "bus-1");
    expect(handlers.has("moveend")).toBe(false);
    await advance(15000);
    expect(get).toHaveBeenCalledTimes(2);
    await render();
    expect(handlers.has("moveend")).toBe(true);
    expect(get.mock.calls[2][0]).toEqual([-123, 45, -122, 46]);
  });

  it("keeps only the selected fresh position when the first ID request fails", async () => {
    get.mockResolvedValueOnce({ ...snapshot(), vehicles: [vehicle, { ...vehicle, id: "another" }] });
    await render();
    get.mockRejectedValue(new Error("Service unavailable"));
    await render(true, true, vehicle.id);
    expect(feed.status).toBe("error");
    expect(feed.vehicles).toEqual([vehicle]);
    await advance(90000);
    expect(feed.vehicles).toEqual([]);
  });
});
