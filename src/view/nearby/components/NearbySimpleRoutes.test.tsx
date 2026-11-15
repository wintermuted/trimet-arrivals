import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { getArrivals } from "../../../api/trimet/arrivals";
import { Arrival, ArrivalData } from "../../../api/trimet/interfaces/arrivals";
import {
  StopData,
  StopLocation,
  TrimetRoute,
} from "../../../api/trimet/interfaces/types";
import { arrival1 } from "../../../api/trimet/fixture/arrival";
import NearbySimpleRoutes, {
  filterRouteStructures,
  getRouteArrivals,
} from "./NearbySimpleRoutes";

jest.mock("../../../api/trimet/arrivals");

const now = Date.parse("2026-11-15T10:00:00Z");
const minute = 60 * 1000;
const route: TrimetRoute = {
  route: 54,
  desc: "Beaverton",
  type: "bus",
  dir: [
    { dir: 0, desc: "Northbound" },
    { dir: 1, desc: "Southbound" },
  ],
};

function stop(locid: number, distance: number): StopLocation {
  return {
    locid,
    desc: `Stop ${locid}`,
    dir: "N",
    lat: 0,
    lng: distance,
    route: [route],
  };
}

const nearbyStops: StopData = {
  queryTime: "",
  location: [stop(101, 0.01), stop(102, 0.02)],
};

function arrival(overrides: Partial<Arrival> = {}): Arrival {
  return {
    ...arrival1,
    id: "arrival",
    route: 54,
    dir: 0,
    locid: 101,
    estimated: now + 10 * minute,
    scheduled: now + 8 * minute,
    ...overrides,
  };
}

function response(arrivals: Arrival[]): ArrivalData {
  return {
    arrival: arrivals,
    detour: [],
    location: [],
    queryTime: String(now),
  };
}

describe("NearbySimpleRoutes", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.mocked(getArrivals).mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("groups both directions, keeps multiple stops, and orders stops by distance", () => {
    const routes = getRouteArrivals(
      response([
        arrival({ id: "north", dir: 0 }),
        arrival({ id: "south", dir: 1, locid: 102 }),
        arrival({ id: "other-route", route: 12, dir: 0 }),
      ]),
      nearbyStops,
      [0, 0]
    );

    expect(routes.map((item) => item.key)).toEqual(["54-0", "54-1"]);
    expect(routes[0].stops.map((item) => item.stop.locid)).toEqual([101, 102]);
    expect(routes[0].stops[0].arrivals.map((item) => item.id)).toEqual([
      "north",
    ]);
    expect(routes[1].stops[0].arrivals).toEqual([]);
    expect(filterRouteStructures(routes, ["direction:54-1"])).toEqual([
      routes[1],
    ]);
    expect(filterRouteStructures(routes, ["route:54"])).toEqual(routes);
  });

  it("keeps route details, arrivals navigation, and stop selection in sync", async () => {
    jest.mocked(getArrivals).mockResolvedValue(response([]));
    await act(async () =>
      root.render(
        <MemoryRouter>
          <NearbySimpleRoutes
            nearbyStops={nearbyStops}
            currentLocation={[0, 0]}
            radiusSize={1000}
            handleSimpleRoutesOpened={jest.fn()}
            handleRadiusSelectionChange={jest.fn()}
            routeCount={1}
            stopCount={2}
          />
        </MemoryRouter>
      )
    );

    expect(getArrivals).toHaveBeenCalledWith("101,102", 90);
    expect(container.textContent).toContain("Northbound");
    expect(container.textContent).toContain("Southbound");
    expect(container.textContent).toContain("No arrivals reported");
    expect(container.querySelector('a[href="/lines/54"]')).not.toBeNull();
    expect(
      container.querySelector(
        'a[href="/nearby/simple-routes/54?stop=101&direction=0"]'
      )
    ).not.toBeNull();
    expect(container.textContent).toContain("feet away");

    const stopSelect = container.querySelector<HTMLSelectElement>(
      'select[aria-label="Stop for Route 54, Northbound"]'
    );
    expect(stopSelect).not.toBeNull();
    if (!stopSelect) {
      throw new Error("The Northbound stop selector was not rendered.");
    }
    await act(async () => {
      stopSelect.value = "102";
      stopSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(
      container.querySelector(
        'a[href="/nearby/simple-routes/54?stop=102&direction=0"]'
      )
    ).not.toBeNull();
  });

  it("shows a recoverable error when arrivals fail", async () => {
    jest.mocked(getArrivals).mockRejectedValueOnce(new Error("Offline"));
    await act(async () =>
      root.render(
        <MemoryRouter>
          <NearbySimpleRoutes
            nearbyStops={nearbyStops}
            currentLocation={[0, 0]}
            radiusSize={1000}
            handleSimpleRoutesOpened={jest.fn()}
            handleRadiusSelectionChange={jest.fn()}
            routeCount={1}
            stopCount={2}
          />
        </MemoryRouter>
      )
    );

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Nearby arrivals could not be loaded."
    );

    jest.mocked(getArrivals).mockResolvedValue(response([]));
    const retryButton = container.querySelector<HTMLButtonElement>(
      '[role="alert"] button'
    );
    if (!retryButton) {
      throw new Error("The retry button was not rendered.");
    }
    await act(async () => {
      retryButton.click();
    });
    expect(container.textContent).toContain("No arrivals reported");
  });

  it("sorts by nearest stop when selected", async () => {
    const route12: TrimetRoute = {
      route: 12,
      desc: "Sandy",
      type: "bus",
      dir: [{ dir: 0, desc: "Eastbound" }],
    };
    const stops: StopData = {
      queryTime: "",
      location: [stop(101, 0.02), { ...stop(102, 0.01), route: [route12] }],
    };
    jest.mocked(getArrivals).mockResolvedValue(
      response([
        arrival({ route: 54, locid: 101, estimated: now + 5 * minute }),
        arrival({
          id: "route-12",
          route: 12,
          locid: 102,
          estimated: now + 15 * minute,
        }),
      ])
    );

    await act(async () =>
      root.render(
        <MemoryRouter>
          <NearbySimpleRoutes
            nearbyStops={stops}
            currentLocation={[0, 0]}
            radiusSize={1000}
            handleSimpleRoutesOpened={jest.fn()}
            handleRadiusSelectionChange={jest.fn()}
            routeCount={2}
            stopCount={2}
          />
        </MemoryRouter>
      )
    );

    const routeLinks = () =>
      Array.from(container.querySelectorAll(".transit-simple-route-item")).map(
        (item) => item.querySelector('a[href^="/lines/"]')?.getAttribute("href")
      );
    expect(routeLinks()[0]).toBe("/lines/54");

    const sortSelect =
      container.querySelector<HTMLSelectElement>("#nearby-route-sort");
    if (!sortSelect) {
      throw new Error("The route sort selector was not rendered.");
    }
    await act(async () => {
      sortSelect.value = "distance";
      sortSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(routeLinks()[0]).toBe("/lines/12");
  });
});
