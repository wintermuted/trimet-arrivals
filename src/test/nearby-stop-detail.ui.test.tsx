import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { getArrivals } from "../api/trimet/arrivals";
import { getNearbyStops } from "../api/trimet/stops";
import { ArrivalData } from "../api/trimet/interfaces/arrivals";
import { getWalkingRoute, WalkingRoute } from "../api/mapbox/walking";
import { NearbyStopsDetail } from "../view/nearby/components/NearbyStopsDetail";

jest.mock("../api/trimet/arrivals");
jest.mock("../api/trimet/stops");
jest.mock("../api/mapbox/walking");

function stopData(id: number): ArrivalData {
  return {
    arrival: [],
    detour: [],
    location: [
      {
        desc: `Example stop ${id}`,
        dir: "E",
        id,
        lat: 0.001,
        lng: 0.001,
        passengerCode: "E",
      },
    ],
    queryTime: "",
  };
}

const walking: WalkingRoute = {
  feature: {
    geometry: {
      coordinates: [
        [0, 0],
        [0, 0.001],
        [0.001, 0.001],
      ],
      type: "LineString",
    },
    properties: {},
    type: "Feature",
  },
  meters: 200,
  seconds: 150,
  status: "ready",
};

describe("general Nearby stop walking access", () => {
  let container: HTMLDivElement;
  let root: Root;
  const handleStopOpened = jest.fn();
  const close = jest.fn();
  const onWalkingRouteChanged = jest.fn(() => close);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getArrivals).mockReset().mockResolvedValue(stopData(340));
    jest.mocked(getNearbyStops).mockReset().mockResolvedValue({
      queryTime: "",
      location: [340, 367].map((locid) => ({
        locid, desc: `Example stop ${locid}`, dir: "E", lat: 0.001, lng: 0.001,
        route: [
          { route: 54, desc: "Beaverton Hillsdale", type: "bus", dir: [] },
          { route: 56, desc: "Scholls Ferry", type: "bus", dir: [] }
        ]
      }))
    });
    jest.mocked(getWalkingRoute).mockReset().mockResolvedValue(walking);
    onWalkingRouteChanged.mockReturnValue(close);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(enabled = false, path = "/nearby/stops/340") {
    return act(async () =>
      root.render(
        <MemoryRouter initialEntries={[path]}>
          <Link to="/nearby/stops/367">Next stop</Link>
          <Routes>
            <Route
              path="/nearby/stops/:id"
              element={
                <NearbyStopsDetail
                  currentLocation={[0, 0]}
                  handleStopOpened={handleStopOpened}
                  walkingEnabled={enabled}
                  onWalkingRouteChanged={onWalkingRouteChanged}
                />
              }
            />
          </Routes>
        </MemoryRouter>
      )
    );
  }

  it("uses the current location and exact stop ID only when the shared flag is enabled", async () => {
    await render();
    expect(getWalkingRoute).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("Walk to stop");
    await render(true);
    expect(getArrivals).toHaveBeenCalledTimes(1);
    expect(getWalkingRoute).toHaveBeenCalledWith(
      [0, 0],
      { lat: 0.001, lng: 0.001, locid: 340 },
      expect.any(AbortSignal)
    );
    expect(
      container.querySelector('section[aria-label="Walk to stop"]')
    ).not.toBeNull();
    expect(container.textContent).toContain("dashed green line");
    expect(onWalkingRouteChanged).toHaveBeenCalledTimes(1);
    await render(false);
    expect(close).toHaveBeenCalledTimes(1);
    expect(jest.mocked(getWalkingRoute).mock.calls[0][2].aborted).toBe(true);
    expect(getArrivals).toHaveBeenCalledTimes(1);
  });

  it("removes the previous path before loading another stop and ignores stale stop responses", async () => {
    let resolveStop: (data: ArrivalData) => void;
    await render(true);
    jest.mocked(getArrivals).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveStop = resolve;
        })
    );
    await act(async () =>
      container
        .querySelector<HTMLAnchorElement>('a[href="/nearby/stops/367"]')
        .click()
    );
    expect(close).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Loading stop");
    expect(container.textContent).not.toContain("Example stop 340");
    expect(getWalkingRoute).toHaveBeenCalledTimes(1);
    await act(async () => root.render(null));
    await act(async () => resolveStop(stopData(367)));
    expect(handleStopOpened).toHaveBeenCalledTimes(1);
    expect(getWalkingRoute).toHaveBeenCalledTimes(1);
  });

  it("offers retry for failed stop data and never routes to an unrelated stop", async () => {
    jest
      .mocked(getArrivals)
      .mockResolvedValueOnce(stopData(367))
      .mockResolvedValueOnce(stopData(340));
    await render(true);
    expect(container.querySelector('[role="alert"]').textContent).toContain(
      "Could not load this stop"
    );
    expect(getWalkingRoute).not.toHaveBeenCalled();
    await act(async () => container.querySelector("button").click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(getWalkingRoute).toHaveBeenCalledTimes(1);
    expect(handleStopOpened).toHaveBeenCalledWith(stopData(340).location[0]);
  });

  it("preserves the route referrer while loading and after the stop loads", async () => {
    let resolveStop: (data: ArrivalData) => void;
    jest.mocked(getArrivals).mockImplementationOnce(() => new Promise((resolve) => {
      resolveStop = resolve;
    }));
    const referrer = "/nearby/simple-routes?route=54&keep=yes#directions";
    await render(false, `/nearby/stops/340?${new URLSearchParams({ referrer })}`);
    expect(container.textContent).toContain("Loading stop");
    expect(container.querySelector<HTMLAnchorElement>('a[aria-label="Back"]').getAttribute("href")).toBe(referrer);
    await act(async () => resolveStop(stopData(340)));
    expect(container.textContent).toContain("Example stop 340");
    expect(container.querySelector<HTMLAnchorElement>('a[aria-label="Back"]').getAttribute("href")).toBe(referrer);
  });

  it("retains the route referrer when the stop fails to load", async () => {
    jest.mocked(getArrivals).mockRejectedValueOnce(new Error("Unavailable"));
    const referrer = "/nearby/simple-routes?route=54";
    await render(false, `/nearby/stops/340?${new URLSearchParams({ referrer })}`);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.querySelector<HTMLAnchorElement>('a[aria-label="Back"]').getAttribute("href")).toBe(referrer);
  });

  it("returns direct stop links to Nearby Stops", async () => {
    await render();
    expect(container.querySelector<HTMLAnchorElement>('a[aria-label="Back"]').getAttribute("href")).toBe("/nearby/stops");
  });

  it("shows all routes serving the exact stop even when there are no departures", async () => {
    jest.mocked(getNearbyStops).mockResolvedValueOnce({
      queryTime: "",
      location: [
        { locid: 999, desc: "Other stop", dir: "E", lat: 0.001, lng: 0.001,
          route: [{ route: 99, desc: "Other route", type: "bus", dir: [] }] },
        { locid: 340, desc: "Example stop 340", dir: "E", lat: 0.001, lng: 0.001,
          route: [
            { route: 54, desc: "Beaverton Hillsdale", type: "bus", dir: [] },
            { route: 56, desc: "Scholls Ferry", type: "bus", dir: [] }
          ] }
      ]
    });
    await render();
    expect(getNearbyStops).toHaveBeenCalledWith(
      { coords: { latitude: 0.001, longitude: 0.001 } }, 100
    );
    expect(container.querySelector('[aria-label="Route 54: Beaverton Hillsdale"]')?.textContent).toBe("54");
    expect(container.querySelector('[aria-label="Route 56: Scholls Ferry"]')?.getAttribute("title")).toBe("Scholls Ferry");
    expect(container.querySelector('[aria-label="Route 99: Other route"]')).toBeNull();
  });

  it("reports missing stop metadata instead of displaying another stop's routes", async () => {
    jest.mocked(getNearbyStops).mockResolvedValueOnce({
      queryTime: "", location: [{
        locid: 999, desc: "Other stop", dir: "E", lat: 0.001, lng: 0.001,
        route: [{ route: 99, desc: "Other route", type: "bus", dir: [] }]
      }]
    });
    await render();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Routes could not be loaded");
    expect(container.querySelector('[aria-label="Route 99: Other route"]')).toBeNull();
  });

  it("reports route lookup errors and retries without losing the stop", async () => {
    jest.mocked(getNearbyStops).mockRejectedValueOnce(new Error("Unavailable"));
    await render();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Routes could not be loaded");
    expect(container.textContent).toContain("Example stop 340");
    await act(async () => Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Retry routes").click());
    expect(container.querySelector('[aria-label="Route 56: Scholls Ferry"]')).not.toBeNull();
  });

  it("removes the selected stop marker on navigation", async () => {
    const cleanup = jest.fn();
    handleStopOpened.mockReturnValueOnce(cleanup);
    await render();
    jest.mocked(getArrivals).mockResolvedValueOnce(stopData(367));
    await act(async () => container.querySelector<HTMLAnchorElement>('a[href="/nearby/stops/367"]').click());
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(handleStopOpened).toHaveBeenLastCalledWith(stopData(367).location[0]);
  });

  it.each(["https://example.com", "//example.com", "/\\example.com", "/nearby/../../outside", "/outside", ""])(
    "rejects an unsafe or invalid referrer %s",
    async (referrer) => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      try {
        await render(false, `/nearby/stops/340?${new URLSearchParams({ referrer })}`);
        expect(container.querySelector<HTMLAnchorElement>('a[aria-label="Back"]').getAttribute("href")).toBe("/nearby/stops");
        expect(warn).toHaveBeenCalledWith("Invalid stop referrer; returning to nearby stops.");
      } finally {
        warn.mockRestore();
      }
    }
  );
});
