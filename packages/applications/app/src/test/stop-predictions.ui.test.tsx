import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { getArrivals } from "../api/trimet/arrivals";
import { getRouteByIdAndDirection } from "../api/trimet/routeConfig";
import { getNearbyStops } from "../api/trimet/stops";
import { arrival1 } from "../api/trimet/fixture/arrival";
import { Arrival, ArrivalData } from "../api/trimet/interfaces/arrivals";
import { RouteDirectionStop } from "../api/trimet/interfaces/routes";
import NearbySimpleRouteArrivals from "../view/nearby/components/NearbySimpleRouteArrivals";
import { StopsOnRoute } from "../view/nearby/components/common/StopsOnRoute";

jest.mock("../api/trimet/arrivals");
jest.mock("../api/trimet/routeConfig");
jest.mock("../api/trimet/stops");
jest.mock("../view/nearby/components/common/InfoCard", () => ({ InfoCard: () => null }));

const now = Date.parse("2026-11-15T06:00:00Z");
const minute = 60000;
const stop = (locid: number, seq = locid): RouteDirectionStop => ({
  locid, seq, desc: `Stop ${locid}`, dir: "E", tp: true, lat: 1, lng: 1
});
const arrival = (overrides: Partial<Arrival> = {}): Arrival => ({
  ...arrival1, id: "a", route: 54, dir: 1, locid: 101, tripID: "trip-a",
  status: "estimated", estimated: now + 10 * minute, scheduled: now + 8 * minute,
  dropOffOnly: false, ...overrides
});
const response = (arrivals: Arrival[]): ArrivalData => ({
  arrival: arrivals, location: [], detour: [], queryTime: String(now)
});
const load = jest.mocked(getArrivals);

describe("selected departure stop predictions", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    load.mockReset();
    jest.mocked(getRouteByIdAndDirection).mockReset();
    jest.mocked(getNearbyStops).mockReset().mockImplementation(() => new Promise(() => {}));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  async function renderStops(stops: RouteDirectionStop[], selected = arrival(), repeated: number[] = []) {
    await act(async () => root.render(
      <StopsOnRoute remainingStopsOnRoute={stops} selectedArrival={selected} repeatedStopIds={repeated} />
    ));
  }

  function row(id: number) {
    return Array.from(container.querySelectorAll("li")).find(item => item.textContent.includes(`Stop ${id} (`));
  }

  it("uses only the selected trip, route, direction and stop, and labels scheduled times", async () => {
    load.mockResolvedValue(response([
      arrival({ locid: 102, tripID: "other", estimated: now + 11 * minute }),
      arrival({ locid: 102, route: 12, estimated: now + 12 * minute }),
      arrival({ locid: 102, dir: 0, estimated: now + 13 * minute }),
      arrival({ locid: 102, status: "canceled", estimated: now + 14 * minute }),
      arrival({ locid: 102, status: "scheduled", estimated: undefined, scheduled: now + 25 * minute })
    ]));
    await renderStops([stop(102), stop(103)]);
    expect(load).toHaveBeenCalledWith("102,103", 60);
    expect(row(102).textContent).toContain("10:25 PM Scheduled");
    expect(row(103).textContent).toContain("Not reported");
    expect(row(102).textContent).not.toContain("10:11 PM");
  });

  it("does not fetch or invent times for a missing trip ID or ambiguous repeated stop", async () => {
    await renderStops([stop(102), stop(103, 1), stop(103, 2)], arrival({ tripID: undefined }), [103]);
    expect(load).not.toHaveBeenCalled();
    expect(row(102).textContent).toContain("Not reported");
    expect(container.textContent).toContain("no trip ID");
    load.mockResolvedValue(response([arrival({ locid: 102, estimated: now + 20 * minute })]));
    await renderStops([stop(102), stop(103, 1), stop(103, 2)], arrival(), [103]);
    expect(load).toHaveBeenCalledWith("102", 60);
    expect(container.querySelectorAll("li")).toHaveLength(3);
    expect(row(103).textContent).toContain("Not reported");
    expect(container.textContent).toContain("repeated stops");
  });

  it("batches at 128 stops, reports partial failures, retries, and labels retained stale times", async () => {
    const stops = Array.from({ length: 129 }, (_, index) => stop(1000 + index));
    load.mockImplementation(async ids => {
      if (ids === "1128") throw new Error("Offline");
      return response([arrival({ locid: 1000, estimated: now + 20 * minute })]);
    });
    await renderStops(stops);
    expect(load).toHaveBeenCalledTimes(2);
    expect(load.mock.calls[0][0].split(",")).toHaveLength(128);
    expect(load.mock.calls[1]).toEqual(["1128", 60]);
    expect(row(1000).textContent).toContain("10:20 PM Estimated");
    expect(row(1128).textContent).toContain("Unavailable");
    expect(container.querySelector('[role="alert"]').textContent).toContain("could not be loaded or refreshed");

    load.mockImplementation(async ids => {
      if (ids !== "1128") throw new Error("Offline");
      return response([arrival({ locid: 1128, estimated: now + 30 * minute })]);
    });
    await act(async () => container.querySelector<HTMLButtonElement>("button").click());
    expect(row(1000).textContent).toContain("10:20 PM Estimated · Last received");
    expect(row(1128).textContent).toContain("10:30 PM Estimated");
    await act(async () => jest.advanceTimersByTime(30000));
    expect(load).toHaveBeenCalledTimes(6);
    act(() => root.render(null));
    await act(async () => jest.advanceTimersByTime(60000));
    expect(load).toHaveBeenCalledTimes(6);
  });

  it("allows retry while a request is delayed and ignores the superseded response", async () => {
    let resolveOld: (value: ArrivalData) => void;
    load.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    load.mockResolvedValueOnce(response([arrival({ locid: 102, estimated: now + 30 * minute })]));
    await renderStops([stop(102)]);
    expect(container.querySelector('[role="status"]').textContent).toContain("Loading");
    await act(async () => container.querySelector<HTMLButtonElement>("button").click());
    expect(row(102).textContent).toContain("10:30 PM");
    await act(async () => resolveOld(response([arrival({ locid: 102, estimated: now + 20 * minute })])));
    expect(row(102).textContent).toContain("10:30 PM");
  });

  it("shows completed batches while another batch is still loading", async () => {
    const stops = Array.from({ length: 129 }, (_, index) => stop(1000 + index));
    let resolveLast: (value: ArrivalData) => void;
    load.mockImplementation(ids => ids === "1128"
      ? new Promise(resolve => { resolveLast = resolve; })
      : Promise.resolve(response([arrival({ locid: 1000, estimated: now + 20 * minute })])));
    await renderStops(stops);
    expect(row(1000).textContent).toContain("10:20 PM Estimated");
    expect(row(1128).textContent).toContain("Loading");
    await act(async () => resolveLast(response([])));
    expect(row(1128).textContent).toContain("Not reported");
  });

  it("switches predictions with departure selection and ignores the earlier trip's late response", async () => {
    const first = arrival();
    const second = arrival({ id: "b", tripID: "trip-b", estimated: now + 15 * minute });
    jest.mocked(getRouteByIdAndDirection).mockResolvedValue({
      route: [{ route: 54, id: 54, desc: "Example", routeColor: "", routeSortOrder: 54, type: "B",
        dir: [{ dir: 1, desc: "To Example", stop: [stop(101, 1), stop(102, 2)] }] }]
    });
    let resolveOld: (value: ArrivalData) => void;
    let downstreamCalls = 0;
    load.mockImplementation(id => {
      if (id === "101") return Promise.resolve(response([first, second]));
      downstreamCalls++;
      if (downstreamCalls === 1) return new Promise(resolve => { resolveOld = resolve; });
      return Promise.resolve(response([arrival({ locid: 102, tripID: "trip-b", estimated: now + 30 * minute })]));
    });
    const map = jest.fn();
    await act(async () => root.render(
      <MemoryRouter initialEntries={["/nearby/simple-routes/54?stop=101&direction=1"]}>
        <Routes><Route path="/nearby/simple-routes/:id" element={<NearbySimpleRouteArrivals onSelectionChanged={map} />} /></Routes>
      </MemoryRouter>
    ));
    expect(row(102).textContent).toContain("Loading");
    const departures = container.querySelectorAll<HTMLButtonElement>(".transit-departure-option");
    await act(async () => departures[1].click());
    expect(departures[1].getAttribute("aria-pressed")).toBe("true");
    expect(row(102).textContent).toContain("10:30 PM Estimated");
    await act(async () => resolveOld(response([arrival({ locid: 102, estimated: now + 20 * minute })])));
    expect(row(102).textContent).toContain("10:30 PM Estimated");
    expect(row(102).textContent).not.toContain("10:20 PM");

    load.mockImplementation(async id => id === "101"
      ? response([first])
      : response([arrival({ locid: 102, estimated: now + 20 * minute })]));
    await act(async () => jest.advanceTimersByTime(30000));
    expect(container.querySelector<HTMLButtonElement>(".transit-departure-option").getAttribute("aria-pressed")).toBe("true");
    expect(row(102).textContent).toContain("10:20 PM Estimated");

    load.mockImplementation(async id => {
      if (id === "101") throw new Error("Offline");
      return response([arrival({ locid: 102, estimated: now + 20 * minute })]);
    });
    await act(async () => jest.advanceTimersByTime(30000));
    expect(container.querySelector('[role="alert"]').textContent).toContain("last received departures");
    expect(container.querySelector(".transit-departure-option")).not.toBeNull();
  });

  it.each([
    ["route", 56, 1],
    ["direction", 54, 0],
    ["origin", 54, 1]
  ])("ignores old stop predictions after changing %s", async (_change, nextRoute, nextDirection) => {
    jest.mocked(getRouteByIdAndDirection).mockImplementation(async (routeId, direction) => ({
      route: [{ route: routeId, id: routeId, desc: "Example", routeColor: "", routeSortOrder: routeId, type: "B",
        dir: [{ dir: direction, desc: "To Example", stop: routeId === 54 && direction === 1
          ? [stop(101, 1), stop(102, 2), stop(201, 3), stop(202, 4)]
          : [stop(201, 3), stop(202, 4)] }] }]
    }));
    let resolveOld: (value: ArrivalData) => void;
    load.mockImplementation(id => {
      if (id === "101") return Promise.resolve(response([arrival()]));
      if (id === "201") return Promise.resolve(response([
        arrival({ id: "b", tripID: "trip-b", route: nextRoute, dir: nextDirection, locid: 201 })
      ]));
      if (id === "202") return Promise.resolve(response([
        arrival({ tripID: "trip-b", route: nextRoute, dir: nextDirection, locid: 202, estimated: now + 30 * minute })
      ]));
      return new Promise(resolve => { resolveOld = resolve; });
    });
    function ChangeSelection() {
      const navigate = useNavigate();
      return <button onClick={() => navigate(`/nearby/simple-routes/${nextRoute}?stop=201&direction=${nextDirection}`)}>Change</button>;
    }
    await act(async () => root.render(
      <MemoryRouter initialEntries={["/nearby/simple-routes/54?stop=101&direction=1"]}>
        <ChangeSelection />
        <Routes><Route path="/nearby/simple-routes/:id" element={<NearbySimpleRouteArrivals onSelectionChanged={jest.fn()} />} /></Routes>
      </MemoryRouter>
    ));
    await act(async () => container.querySelector<HTMLButtonElement>("button").click());
    expect(row(202).textContent).toContain("10:30 PM Estimated");
    await act(async () => resolveOld(response([arrival({ locid: 202, estimated: now + 20 * minute })])));
    expect(row(202).textContent).toContain("10:30 PM Estimated");
    expect(row(202).textContent).not.toContain("10:20 PM");
  });
});
