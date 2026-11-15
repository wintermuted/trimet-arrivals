import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { getArrivals } from "../api/trimet/arrivals";
import { arrival1 } from "../api/trimet/fixture/arrival";
import { Arrival, ArrivalData } from "../api/trimet/interfaces/arrivals";
import NearbyTripTimes from "../view/nearby/components/NearbyTripTimes";
import { getTripTimes } from "../view/nearby/util/tripTimes";

jest.mock("../api/trimet/arrivals");
const loadArrivals = jest.mocked(getArrivals);
const now = Date.parse("2026-11-15T06:00:00Z");
const minute = 60000;
const origin = { locid: 101, seq: 1, desc: "Boarding Stop", dir: "E", tp: true, lat: 0, lng: 0 };
const destination = { ...origin, locid: 103, seq: 3, desc: "Destination Stop" };

function arrival(overrides: Partial<Arrival> = {}): Arrival {
  return {
    ...arrival1,
    id: `${overrides.locid ?? 101}-${overrides.tripID ?? "trip-a"}`,
    route: 54, dir: 1, locid: 101, tripID: "trip-a",
    status: "estimated", estimated: now + 10 * minute, scheduled: now + 8 * minute,
    dropOffOnly: false,
    ...overrides
  };
}

const departure = arrival();
const atDestination = arrival({
  locid: 103, estimated: now + 24 * minute, scheduled: now + 20 * minute,
  dropOffOnly: true
});

function response(arrivals = [departure, atDestination]): ArrivalData {
  return { arrival: arrivals, queryTime: String(now), location: [], detour: [] };
}

describe("corresponding trip times", () => {
  it("matches the same trip, route and direction, not the next bus or shared block", () => {
    const trips = getTripTimes([
      arrival({ locid: 103, tripID: "another-trip", estimated: now + 12 * minute }),
      arrival({ locid: 103, route: 12, estimated: now + 13 * minute }),
      arrival({ locid: 103, dir: 0, estimated: now + 14 * minute }),
      atDestination, departure,
      arrival({ route: 12 })
    ], 54, 1, 101, 103, now);
    expect(trips).toHaveLength(1);
    expect(trips[0]).toMatchObject({
      departure: { at: now + 10 * minute, kind: "Estimated" },
      arrival: { at: now + 24 * minute, kind: "Estimated" },
      durationMs: 14 * minute
    });
  });

  it("uses scheduled stop times when estimates are absent, including overnight journeys", () => {
    const trips = getTripTimes([
      arrival({ status: "scheduled", estimated: undefined, scheduled: now + 115 * minute }),
      arrival({ locid: 103, status: "scheduled", estimated: undefined, scheduled: now + 130 * minute })
    ], 54, 1, 101, 103, now);
    expect(trips[0]).toMatchObject({
      departure: { kind: "Scheduled" }, arrival: { kind: "Scheduled" },
      durationMs: 15 * minute
    });
  });

  it("keeps a departure without inventing a missing, earlier or canceled destination time", () => {
    [[], [arrival({ locid: 103, estimated: now + minute })],
      [arrival({ locid: 103, status: "canceled" })]].forEach(destinations => {
      expect(getTripTimes([departure, ...destinations], 54, 1, 101, 103, now)[0])
        .toMatchObject({ arrival: undefined, durationMs: undefined });
    });
    expect(getTripTimes([
      arrival({ tripID: undefined }), arrival({ locid: 103, tripID: undefined })
    ], 54, 1, 101, 103, now)[0].arrival).toBeUndefined();
  });

  it("excludes past, canceled, uncertain, invalid and drop-off-only boarding times and sorts departures", () => {
    const trips = getTripTimes([
      arrival({ id: "later", tripID: "later", estimated: now + 20 * minute }),
      arrival({ estimated: now - minute }),
      arrival({ status: "canceled" }),
      arrival({ status: "delayed" }),
      arrival({ dropOffOnly: true }),
      arrival({ estimated: NaN, scheduled: 0 }),
      departure
    ], 54, 1, 101, 103, now);
    expect(trips.map(trip => trip.id)).toEqual([departure.id, "later"]);
  });
});

describe("selected-stop trip times view", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(now);
    loadArrivals.mockReset();
    loadArrivals.mockResolvedValue(response());
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  async function render(to = destination) {
    await act(async () => root.render(
      <MemoryRouter>
        <NearbyTripTimes
          routeId={54} direction={1} origin={origin} destination={to}
          routeName="54 Example Route" directionName="To Downtown"
          backTo="/nearby/directions?route=54&direction=1&from=101&to=103"
        />
      </MemoryRouter>
    ));
  }

  it("loads both stops in one snapshot and renders matched departure, duration and arrival", async () => {
    await render();
    expect(loadArrivals).toHaveBeenCalledWith("101,103", 60);
    expect(container.textContent).toContain("Boarding Stop (101)");
    expect(container.textContent).toContain("Destination Stop (103)");
    expect(container.querySelector("tbody").textContent).toMatch(/10:10 PM.*14 min.*10:24 PM/);
    expect(container.querySelectorAll("tbody small")).toHaveLength(2);
    expect(container.querySelector("a").getAttribute("href"))
      .toBe("/nearby/directions?route=54&direction=1&from=101&to=103");
  });

  it("labels scheduled overnight times with the destination date in Portland", async () => {
    loadArrivals.mockResolvedValue(response([
      arrival({ status: "scheduled", estimated: undefined, scheduled: now + 115 * minute }),
      arrival({ locid: 103, status: "scheduled", estimated: undefined, scheduled: now + 130 * minute })
    ]));
    await render();
    expect(container.querySelector("tbody").textContent).toContain("11:55 PM");
    expect(container.querySelector("tbody").textContent).toContain("12:10 AM");
    expect(container.querySelector("tbody").textContent).toContain("Sun, Nov 15");
    expect(container.querySelector("tbody").textContent).toContain("Scheduled");
  });

  it("explains an unmatched destination without displaying a made-up duration", async () => {
    loadArrivals.mockResolvedValue(response([departure]));
    await render();
    expect(container.querySelector("tbody").textContent).toContain("Unavailable");
    expect(container.querySelector("tbody").textContent).toContain("Not reported");
    expect(container.textContent).toContain("destination times are not yet reported");
  });

  it("refreshes automatically and stops polling after the view closes", async () => {
    await render();
    await act(async () => jest.advanceTimersByTime(30000));
    expect(loadArrivals).toHaveBeenCalledTimes(2);
    act(() => root.render(null));
    await act(async () => jest.advanceTimersByTime(60000));
    expect(loadArrivals).toHaveBeenCalledTimes(2);
  });

  it("preserves last received times on refresh errors and supports retry and a real empty state", async () => {
    await render();
    loadArrivals.mockRejectedValueOnce(new Error("Offline"));
    await act(async () => container.querySelector<HTMLButtonElement>("button").click());
    expect(container.querySelector('[role="alert"]').textContent).toContain("last received");
    expect(container.querySelector("tbody")).not.toBeNull();
    loadArrivals.mockResolvedValueOnce(response([]));
    await act(async () => container.querySelector<HTMLButtonElement>("button").click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain("No upcoming boardable trips");
  });

  it.each(["missing result", "API error"])("reports %s rather than presenting it as no service", async reason => {
    const failed = { ...response([]), errorMessage: { content: "Service unavailable" } };
    loadArrivals.mockResolvedValueOnce(reason === "API error" ? failed : undefined);
    await render();
    expect(container.querySelector('[role="alert"]').textContent).toContain("Could not load trip times");
    await act(async () => container.querySelector<HTMLButtonElement>("button").click());
    expect(container.querySelector("tbody")).not.toBeNull();
  });

  it("ignores an older response after changing the selected destination", async () => {
    let resolveOld: (data: ArrivalData) => void;
    loadArrivals.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    await render();
    expect(container.querySelector('[role="status"]').textContent).toContain("Loading");
    loadArrivals.mockResolvedValueOnce(response([
      departure, arrival({ locid: 102, estimated: now + 30 * minute })
    ]));
    await render({ ...destination, locid: 102, desc: "New Destination" });
    await act(async () => resolveOld(response()));
    expect(container.textContent).toContain("New Destination (102)");
    expect(container.querySelector("tbody").textContent).toContain("20 min");
    expect(container.querySelector("tbody").textContent).not.toContain("14 min");
  });
});
