import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
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
  desc: "Beaverton",
  dir: [
    { desc: "Northbound", dir: 0 },
    { desc: "Southbound", dir: 1 },
  ],
  route: 54,
  type: "bus",
};

function stop(locid: number, distance: number): StopLocation {
  return {
    desc: `Stop ${locid}`,
    dir: "N",
    lat: 0,
    lng: distance,
    locid,
    route: [route],
  };
}

const nearbyStops: StopData = {
  location: [stop(101, 0.01), stop(102, 0.02)],
  queryTime: "",
};

function arrival(overrides: Partial<Arrival> = {}): Arrival {
  return {
    ...arrival1,
    dir: 0,
    estimated: now + 10 * minute,
    id: "arrival",
    locid: 101,
    route: 54,
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

function CurrentLocation() {
  const location = useLocation();
  return (
    <output>
      {location.pathname}
      {location.search}
    </output>
  );
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

  it("groups a route's stops beneath their corresponding directions and opens the clicked stop", async () => {
    const directionalStops: StopData = {
      location: [
        { ...stop(101, 0.01), route: [{ ...route, dir: [route.dir[0]] }] },
        { ...stop(102, 0.02), route: [{ ...route, dir: [route.dir[1]] }] },
        { ...stop(103, 0.03), route: [{ ...route, dir: [route.dir[0]] }] },
      ],
      queryTime: "",
    };
    jest.mocked(getArrivals).mockResolvedValue(response([]));
    await act(async () =>
      root.render(
        <MemoryRouter>
          <NearbySimpleRoutes
            nearbyStops={directionalStops}
            currentLocation={[0, 0]}
            radiusSize={1000}
            handleSimpleRoutesOpened={jest.fn()}
            handleRadiusSelectionChange={jest.fn()}
            routeCount={1}
            stopCount={3}
          />
          <CurrentLocation />
        </MemoryRouter>
      )
    );

    expect(getArrivals).toHaveBeenCalledWith("101,102,103", 90);
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

    expect(
      container.querySelectorAll(".transit-simple-route-group")
    ).toHaveLength(1);
    expect(container.querySelectorAll('a[href="/lines/54"]')).toHaveLength(1);
    const routeDisclosure =
      container.querySelector<HTMLDetailsElement>(".transit-simple-route-group");
    const directionDisclosures = Array.from(
      container.querySelectorAll<HTMLDetailsElement>(
        ".transit-simple-route-direction"
      )
    );
    if (!routeDisclosure || directionDisclosures.length !== 2) {
      throw new Error("The route and direction disclosures were not rendered.");
    }
    expect(routeDisclosure.open).toBe(true);
    expect(directionDisclosures.every((direction) => direction.open)).toBe(true);
    await act(async () => {
      directionDisclosures[0].open = false;
      routeDisclosure.open = false;
      routeDisclosure.open = true;
    });
    expect(directionDisclosures[0].open).toBe(false);
    expect(directionDisclosures[1].open).toBe(true);
    await act(async () => {
      directionDisclosures[0].open = true;
    });

    const north = container.querySelector(
      '[aria-label="Route 54, Northbound stops"]'
    );
    const south = container.querySelector(
      '[aria-label="Route 54, Southbound stops"]'
    );
    expect(north?.textContent).toContain("Stop 101");
    expect(north?.textContent).toContain("Stop 103");
    expect(north?.textContent).not.toContain("Stop 102");
    expect(south?.textContent).toContain("Stop 102");
    expect(south?.textContent).not.toContain("Stop 101");
    expect(north?.querySelectorAll(".transit-simple-route-stop")).toHaveLength(
      2
    );
    const stopLink = north?.querySelector<HTMLAnchorElement>(
      'a[href="/nearby/simple-routes/54?stop=103&direction=0"]'
    );
    if (!stopLink) {
      throw new Error("The second Northbound stop link was not rendered.");
    }
    expect(stopLink.textContent).toContain("View arrivals");
    await act(async () => stopLink.click());
    expect(container.querySelector("output")?.textContent).toBe(
      "/nearby/simple-routes/54?stop=103&direction=0"
    );
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
      desc: "Sandy",
      dir: [{ desc: "Eastbound", dir: 0 }],
      route: 12,
      type: "bus",
    };
    const stops: StopData = {
      location: [
        stop(101, 0.02),
        { ...stop(102, 0.01), route: [route12] },
        stop(103, 0.03),
      ],
      queryTime: "",
    };
    jest.mocked(getArrivals).mockResolvedValue(
      response([
        arrival({ estimated: now + 30 * minute, locid: 101, route: 54 }),
        arrival({ estimated: now + 5 * minute, locid: 103, route: 54 }),
        arrival({
          estimated: now + 15 * minute,
          id: "route-12",
          locid: 102,
          route: 12,
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
            stopCount={3}
          />
        </MemoryRouter>
      )
    );

    const routeLinks = () =>
      Array.from(container.querySelectorAll(".transit-simple-route-group")).map(
        (item) => item.querySelector('a[href^="/lines/"]')?.getAttribute("href")
      );
    expect(routeLinks()[0]).toBe("/lines/54");
    expect(
      container.querySelectorAll(".transit-simple-route-group")
    ).toHaveLength(2);
    expect(container.querySelectorAll('a[href="/lines/54"]')).toHaveLength(1);
    const routeDisclosure = container.querySelector<HTMLDetailsElement>(
      '[aria-labelledby="nearby-route-54"]'
    );
    const directionDisclosure = container.querySelector<HTMLDetailsElement>(
      '[aria-labelledby="nearby-direction-54-0"]'
    );
    if (!routeDisclosure || !directionDisclosure) {
      throw new Error("The route disclosures were not rendered.");
    }
    await act(async () => {
      directionDisclosure.open = false;
      routeDisclosure.open = false;
    });

    const filterButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button")
    ).find((button) => button.getAttribute("aria-label") === "Filter");
    const sortButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button")
    ).find((button) => button.getAttribute("aria-label")?.startsWith("Sort:"));
    if (!filterButton || !sortButton) {
      throw new Error("The route filter and sort buttons were not rendered.");
    }
    await act(async () => filterButton.click());
    expect(filterButton.getAttribute("aria-expanded")).toBe("true");
    await act(async () => sortButton.click());
    expect(filterButton.getAttribute("aria-expanded")).toBe("false");
    expect(sortButton.getAttribute("aria-expanded")).toBe("true");

    const sortSelect =
      document.querySelector<HTMLSelectElement>("#nearby-route-sort");
    if (!sortSelect) {
      throw new Error("The route sort selector was not rendered.");
    }
    await act(async () => {
      sortSelect.value = "distance";
      sortSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(routeLinks()[0]).toBe("/lines/12");
    expect(sortButton.getAttribute("aria-label")).toBe("Sort: Nearest stop");
    expect(
      container.querySelector('[aria-labelledby="nearby-route-54"]')
    ).toBe(routeDisclosure);
    expect(routeDisclosure.open).toBe(false);
    expect(directionDisclosure.open).toBe(false);
  });
});
