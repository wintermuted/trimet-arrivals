import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { getArrivals } from "../../../api/trimet/arrivals";
import { getRouteById } from "../../../api/trimet/routeConfig";
import { Arrival, ArrivalData } from "../../../api/trimet/interfaces/arrivals";
import {
  StopData,
  StopLocation,
  TrimetRoute,
} from "../../../api/trimet/interfaces/types";
import { arrival1 } from "../../../api/trimet/fixture/arrival";
import { getWalkingEstimates, WalkingEstimate } from "../../../api/mapbox/walking";
import NearbySimpleRoutes, {
  filterRouteStructures,
  getRouteArrivals,
} from "./NearbySimpleRoutes";

jest.mock("../../../api/trimet/arrivals");
jest.mock("../../../api/trimet/routeConfig");
jest.mock("../../../api/mapbox/walking");

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
    jest.mocked(getRouteById).mockReset();
    jest.mocked(getWalkingEstimates).mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("only requests walking distances after consent and ranks by walking connections, not radial proximity", async () => {
    jest.mocked(getArrivals).mockResolvedValue(response([]));
    const walking = new Map<number, WalkingEstimate>([
      [101, { meters: 900, seconds: 600, status: "ready" }],
      [102, { meters: 100, seconds: 60, status: "ready" }],
      [103, { meters: 50, seconds: 40, status: "ready" }]
    ]);
    jest.mocked(getWalkingEstimates).mockResolvedValue(walking);
    const candidates = {
      ...nearbyStops,
      location: [...nearbyStops.location, { ...stop(103, 0.03), route: [{ ...route, route: 12 }] }]
    };
    function WalkingRoutes({ enabled }: { enabled: boolean }) {
      return (
        <NearbySimpleRoutes
          nearbyStops={candidates} currentLocation={[0, 0]} radiusSize={1000}
          handleSimpleRoutesOpened={jest.fn()} handleRadiusSelectionChange={jest.fn()}
          routeCount={2} stopCount={3} walkingEnabled={enabled}
        />
      );
    }
    await act(async () => root.render(<MemoryRouter><WalkingRoutes enabled={false} /></MemoryRouter>));
    expect(getWalkingEstimates).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("Enable walking estimates");
    expect(container.textContent).toContain("(straight-line)");
    expect(container.querySelector(".transit-simple-route-heading strong").textContent).toBe("54");
    await act(async () => root.render(<MemoryRouter><WalkingRoutes enabled /></MemoryRouter>));
    expect(getWalkingEstimates).toHaveBeenCalledTimes(1);
    expect(container.querySelector(".transit-simple-route-heading strong").textContent).toBe("12");
    const north = container.querySelector('[aria-labelledby="nearby-direction-54-0"]');
    expect(Array.from(north.querySelectorAll("[data-stop-id]")).map(link => link.getAttribute("data-stop-id"))).toEqual(["102", "101"]);
    expect(north.textContent).toContain("328 ft walk");
    await act(async () => root.render(<MemoryRouter><WalkingRoutes enabled={false} /></MemoryRouter>));
    expect(jest.mocked(getWalkingEstimates).mock.calls[0][2].aborted).toBe(true);
    expect(north.textContent).not.toContain("ft walk");
    expect(container.querySelector(".transit-simple-route-heading strong").textContent).toBe("54");
  });

  it("labels walking failures and retries without silently treating straight-line distances as walking", async () => {
    jest.mocked(getArrivals).mockResolvedValue(response([]));
    jest.mocked(getWalkingEstimates)
      .mockRejectedValueOnce(new Error("Mapbox walking request limit reached."))
      .mockResolvedValueOnce(new Map<number, WalkingEstimate>([
        [101, { status: "unreachable" }],
        [102, { meters: 100, seconds: 60, status: "ready" }]
      ]));
    await act(async () => root.render(
      <MemoryRouter>
        <NearbySimpleRoutes
          nearbyStops={nearbyStops} currentLocation={[0, 0]} radiusSize={1000}
          handleSimpleRoutesOpened={jest.fn()} handleRadiusSelectionChange={jest.fn()}
          routeCount={1} stopCount={2} walkingEnabled
        />
      </MemoryRouter>
    ));
    expect(container.querySelector('[role="alert"]').textContent).toContain("limit reached");
    expect(container.textContent).toContain("Walking distance unavailable");
    expect(container.textContent).toContain("(straight-line)");
    const retry = Array.from(container.querySelectorAll("button")).find(button => button.textContent === "Retry walking estimates");
    await act(async () => retry.click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain("No walking route found");
    expect(container.textContent).toContain("328 ft walk");
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
    jest.mocked(getRouteById).mockResolvedValue({
      route: [{
        route: 54, id: 54, desc: "Beaverton", type: "bus",
        routeColor: "", routeSortOrder: 54,
        dir: [
          { dir: 0, desc: "Northbound", stop: [{ ...stop(101, 0.01), seq: 1, tp: false }] },
          { dir: 1, desc: "Southbound", stop: [{ ...stop(102, 0.02), seq: 1, tp: false }] }
        ]
      }]
    });
    const cleanupMap = jest.fn();
    const onRouteInfoChanged = jest.fn(() => cleanupMap);
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
            onRouteInfoChanged={onRouteInfoChanged}
          />
          <CurrentLocation />
        </MemoryRouter>
      )
    );

    expect(getArrivals).toHaveBeenCalledWith("101,102,103", 90);
    expect(container.textContent).toContain("Northbound");
    expect(container.textContent).toContain("Southbound");
    expect(container.textContent).toContain("No arrivals reported");
    expect(
      container.querySelector(
        'a[href="/nearby/simple-routes/54?stop=101&direction=0"]'
      )
    ).not.toBeNull();
    expect(container.textContent).toContain("feet away");

    expect(
      container.querySelectorAll(".transit-simple-route-group")
    ).toHaveLength(1);
    expect(container.querySelector(".transit-simple-route-heading strong")?.textContent).toBe("54");
    const info = container.querySelector<HTMLButtonElement>(".transit-simple-route-details-link");
    expect(info?.getAttribute("aria-label")).toBe("View Route 54 details");
    expect(info?.querySelector(".fa-info-circle")).not.toBeNull();
    expect(info?.closest("details")).toBeNull();
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
      routeDisclosure.open = false;
      info.click();
    });
    expect(container.querySelector("output")?.textContent).toBe("/");
    expect(container.querySelector('[aria-label="Route 54 details"]')?.textContent).toContain("Stop 102");
    expect(onRouteInfoChanged).toHaveBeenCalledTimes(1);
    expect(container.querySelector('a[href="/lines/54"]')).not.toBeNull();
    const close = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Close");
    await act(async () => close.click());
    expect(cleanupMap).toHaveBeenCalledTimes(1);
    expect(routeDisclosure.open).toBe(false);
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

  it("reports route detail failures and retries without leaving the nearby list", async () => {
    jest.mocked(getArrivals).mockResolvedValue(response([]));
    jest.mocked(getRouteById)
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValueOnce({
        route: [{
          route: 54, id: 54, desc: "Beaverton", type: "bus",
          routeColor: "", routeSortOrder: 54,
          dir: [{ dir: 0, desc: "Northbound", stop: [{ ...stop(101, 0.01), seq: 1, tp: false }] }]
        }]
      });
    await act(async () => root.render(
      <MemoryRouter>
        <NearbySimpleRoutes nearbyStops={nearbyStops} currentLocation={[0, 0]} radiusSize={1000}
          handleSimpleRoutesOpened={jest.fn()} handleRadiusSelectionChange={jest.fn()}
          routeCount={1} stopCount={2} />
      </MemoryRouter>
    ));
    await act(async () => container.querySelector<HTMLButtonElement>(".transit-simple-route-details-link").click());
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Route details could not be loaded");
    const retry = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Retry");
    await act(async () => retry.click());
    expect(container.querySelector('[aria-label="Route 54 details"]')?.textContent).toContain("Stop 101");
    expect(getRouteById).toHaveBeenCalledTimes(2);
    await act(async () => container.querySelector('[aria-label="Route 54 details"]').dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    ));
    expect(container.querySelector('[aria-label="Route 54 details"]')).toBeNull();
    expect(container.querySelector(".transit-simple-route-group")).not.toBeNull();
  });

  it("highlights the exact stop on hover and focus and clears hidden or removed rows", async () => {
    jest.mocked(getArrivals).mockResolvedValue(response([]));
    const onStopHighlightChanged = jest.fn();
    async function renderList(data = nearbyStops) {
      await act(async () => root.render(
        <MemoryRouter>
          <NearbySimpleRoutes
            nearbyStops={data}
            currentLocation={[0, 0]}
            radiusSize={1000}
            handleSimpleRoutesOpened={jest.fn()}
            handleRadiusSelectionChange={jest.fn()}
            onStopHighlightChanged={onStopHighlightChanged}
            routeCount={1}
            stopCount={data.location.length}
          />
        </MemoryRouter>
      ));
    }
    await renderList();
    const first = container.querySelector<HTMLAnchorElement>('[data-stop-id="101"]');
    const second = container.querySelector<HTMLAnchorElement>('[data-stop-id="102"]');
    act(() => first.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })));
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith(101);
    act(() => first.dispatchEvent(new MouseEvent("mouseout", { bubbles: true })));
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith(undefined);
    act(() => first.focus());
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith(101);
    act(() => second.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })));
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith(102);
    act(() => second.dispatchEvent(new MouseEvent("mouseout", { bubbles: true })));
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith(101);
    act(() => first.blur());
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith(undefined);

    act(() => first.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })));
    const direction = first.closest("details");
    act(() => {
      direction.open = false;
      direction.dispatchEvent(new Event("toggle"));
    });
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith();
    act(() => { direction.open = true; });
    act(() => first.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })));
    const sortButton = Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
      .find(button => button.getAttribute("aria-label")?.startsWith("Sort:"));
    act(() => sortButton.click());
    const sort = document.querySelector<HTMLSelectElement>("#nearby-route-sort");
    act(() => {
      sort.value = "distance";
      sort.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith();
    expect(getArrivals).toHaveBeenCalledTimes(1);

    act(() => first.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })));
    await renderList({ ...nearbyStops, location: [nearbyStops.location[1]] });
    expect(container.querySelector('[data-stop-id="101"]')).toBeNull();
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith();
    const remaining = container.querySelector<HTMLAnchorElement>('[data-stop-id="102"]');
    act(() => remaining.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })));
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith(102);
    act(() => root.render(<div />));
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith();
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
      Array.from(container.querySelectorAll(".transit-simple-route-details-link")).map(
        (item) => item.getAttribute("aria-label")
      );
    expect(routeLinks()[0]).toBe("View Route 54 details");
    expect(
      container.querySelectorAll(".transit-simple-route-group")
    ).toHaveLength(2);
    expect(container.querySelectorAll('[aria-label="View Route 54 details"]')).toHaveLength(1);
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

    expect(routeLinks()[0]).toBe("View Route 12 details");
    expect(sortButton.getAttribute("aria-label")).toBe("Sort: Nearest stop (straight-line)");
    expect(
      container.querySelector('[aria-labelledby="nearby-route-54"]')
    ).toBe(routeDisclosure);
    expect(routeDisclosure.open).toBe(false);
    expect(directionDisclosure.open).toBe(false);
  });
});
