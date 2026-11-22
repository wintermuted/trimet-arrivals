import { vi } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { getArrivals } from "../api/trimet/arrivals";
import { arrival1 } from "../api/trimet/fixture/arrival";
import { Arrival, ArrivalData } from "../api/trimet/interfaces/arrivals";
import NearbyTripTimes from "../view/nearby/components/NearbyTripTimes";
import { getTripTimes } from "../view/nearby/util/tripTimes";

vi.mock("../api/trimet/arrivals");
const loadArrivals = vi.mocked(getArrivals);
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
      tripId: "trip-a",
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
    vi.useFakeTimers();
    vi.setSystemTime(now);
    loadArrivals.mockReset();
    loadArrivals.mockResolvedValue(response());
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  async function render(to = destination, selectedTrip?: { departureId: string; tripId?: string }, inline = false) {
    await act(async () => root.render(
      <MemoryRouter>
        <NearbyTripTimes
          routeId={54} direction={1} origin={origin} destination={to}
          routeName="54 Example Route" directionName="To Downtown"
          backTo="/nearby/directions?route=54&direction=1&from=101&to=103"
          selectedTrip={selectedTrip}
          inline={inline}
        />
      </MemoryRouter>
    ));
  }

  it("loads both stops in one snapshot and renders matched departure, duration and arrival", async () => {
    await render();
    expect(loadArrivals).toHaveBeenCalledWith("101,103", 60);
    expect(container.textContent).toContain("Boarding Stop (101)");
    expect(container.textContent).toContain("Destination Stop (103)");
    const list = container.querySelector(".transit-upcoming-trips");
    const card = list.querySelector("li > a");
    expect(list.getAttribute("aria-label")).toContain("Upcoming trips from Boarding Stop to Destination Stop");
    expect(card.querySelector(".transit-planner-option-timing").textContent)
      .toMatch(/10:10 PM to 10:24 PM.*14 min ride/);
    expect(card.textContent).toContain("54 Example Route");
    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelector("a").getAttribute("href"))
      .toBe("/nearby/directions?route=54&direction=1&from=101&to=103");
  });

  it("labels scheduled overnight times with the destination date in Portland", async () => {
    loadArrivals.mockResolvedValue(response([
      arrival({ status: "scheduled", estimated: undefined, scheduled: now + 115 * minute }),
      arrival({ locid: 103, status: "scheduled", estimated: undefined, scheduled: now + 130 * minute })
    ]));
    await render();
    const card = container.querySelector(".transit-trip-link");
    expect(card.textContent).toContain("11:55 PM to 12:10 AM");
    expect(card.textContent).toContain("Arrival: Scheduled · Sun, Nov 15");
  });

  it.each([false, true])("links each trip to a bookmarkable detail view (inline: %s)", async inline => {
    const tripID = "trip/a?b=c";
    const id = "board & 1";
    loadArrivals.mockResolvedValue(response([
      arrival({ id, tripID }),
      arrival({ locid: 103, tripID, estimated: now + 24 * minute })
    ]));
    await render(destination, undefined, inline);
    const link = container.querySelector<HTMLAnchorElement>(".transit-trip-link");
    const url = new URL(link.href);
    expect(url.pathname).toBe("/nearby/directions/trip");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      route: "54", direction: "1", from: "101", to: "103",
      departure: id, trip: tripID, ...(inline ? {} : { source: "arrivals" })
    });
    expect(link.textContent).toContain("View trip departing at 10:10 PM");
    expect(container.querySelectorAll(".transit-upcoming-trips a")).toHaveLength(1);
  });

  it("shows only the chosen departure and keeps its identity as estimates refresh", async () => {
    const later = arrival({ id: "board-later", tripID: "trip-later", estimated: now + 20 * minute });
    const laterDestination = arrival({
      id: "destination-later", locid: 103, tripID: "trip-later", estimated: now + 40 * minute
    });
    loadArrivals.mockResolvedValue(response([departure, atDestination, later, laterDestination]));
    await render(destination, { departureId: later.id, tripId: later.tripID });
    expect(container.querySelector("header h3").textContent).toBe("54 Example Route");
    expect(container.querySelector("header .transit-detail-subtitle").textContent).toBe("To Destination Stop");
    expect(container.textContent).toContain("Trip details");
    expect(container.textContent).toContain("Trip trip-later");
    expect(container.querySelector(".transit-upcoming-trips")).toBeNull();
    const details = container.querySelector(".transit-selected-trip");
    expect(details.textContent).toMatch(/10:20 PM.*10:40 PM.*20 min ride/);
    expect(container.querySelector(".transit-trip-link")).toBeNull();

    loadArrivals.mockResolvedValueOnce(response([
      departure, atDestination,
      { ...later, estimated: now + 22 * minute },
      { ...laterDestination, estimated: now + 43 * minute }
    ]));
    await act(async () => container.querySelector<HTMLButtonElement>("button").click());
    expect(details.textContent).toMatch(/10:22 PM.*10:43 PM.*21 min ride/);
    expect(details.textContent).not.toContain("10:10 PM");
  });

  it.each(["unknown departure", "different trip", "no longer reported"])("does not substitute another trip for %s", async reason => {
    if (reason === "no longer reported") {
      loadArrivals.mockResolvedValueOnce(response([]));
    }
    await render(destination, {
      departureId: reason === "unknown departure" ? "missing" : departure.id,
      tripId: reason === "different trip" ? "different" : departure.tripID
    });
    expect(container.querySelector(".transit-upcoming-trips")).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toContain("This trip is no longer reported");
    expect(container.querySelector('[role="status"] a').getAttribute("href"))
      .toBe("/nearby/directions?route=54&direction=1&from=101&to=103");
  });

  it("keeps a reported selected trip after boarding time passes", async () => {
    loadArrivals.mockResolvedValueOnce(response([
      { ...departure, estimated: now - minute }, atDestination
    ]));
    await render(destination, { departureId: departure.id, tripId: departure.tripID });
    expect(container.querySelector(".transit-selected-trip").textContent).toMatch(/9:59 PM.*10:24 PM/);
  });

  it("can select a departure without a trip ID but never invents destination times", async () => {
    loadArrivals.mockResolvedValue(response([{ ...departure, tripID: undefined }, atDestination]));
    await render();
    const url = new URL(container.querySelector<HTMLAnchorElement>(".transit-trip-link").href);
    expect(url.searchParams.get("departure")).toBe(departure.id);
    expect(url.searchParams.has("trip")).toBe(false);
    await render(destination, { departureId: departure.id });
    expect(container.textContent).toContain("Trip ID not reported");
    expect(container.querySelector(".transit-selected-trip").textContent).toContain("Arrival not reported");
  });

  it("explains an unmatched destination without displaying a made-up duration", async () => {
    loadArrivals.mockResolvedValue(response([departure]));
    await render();
    const card = container.querySelector(".transit-trip-link");
    expect(card.textContent).toContain("Travel time unavailable");
    expect(card.textContent).toContain("Arrival not reported");
    expect(card.querySelectorAll("time")).toHaveLength(1);
    expect(container.textContent).toContain("destination times are not yet reported");
  });

  it("refreshes automatically and stops polling after the view closes", async () => {
    await render();
    await act(async () => vi.advanceTimersByTime(30000));
    expect(loadArrivals).toHaveBeenCalledTimes(2);
    act(() => root.render(null));
    await act(async () => vi.advanceTimersByTime(60000));
    expect(loadArrivals).toHaveBeenCalledTimes(2);
  });

  it("preserves last received times on refresh errors and supports retry and a real empty state", async () => {
    await render();
    loadArrivals.mockRejectedValueOnce(new Error("Offline"));
    await act(async () => container.querySelector<HTMLButtonElement>("button").click());
    expect(container.querySelector('[role="alert"]').textContent).toContain("last received");
    expect(container.querySelector(".transit-trip-link")).not.toBeNull();
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
    expect(container.querySelector(".transit-trip-link")).not.toBeNull();
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
    expect(container.querySelector(".transit-trip-link").textContent).toContain("20 min");
    expect(container.querySelector(".transit-trip-link").textContent).not.toContain("14 min");
  });
});
