import { vi } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { getArrivals } from "../../../api/trimet/arrivals";
import { getRouteById } from "../../../api/trimet/routeConfig";
import { StopData, TrimetRoute } from "../../../api/trimet/interfaces/types";
import { getWalkingEstimates, WalkingEstimate } from "../../../api/mapbox/walking";
import NearbySimpleRoutes from "./NearbySimpleRoutes";
import {
  now, minute, route, stop, nearbyStops, arrival, response, CurrentLocation, BrowserHistory
} from "../../../test/fixtures/nearbySimpleRoutes";

vi.mock("../../../api/trimet/arrivals");
vi.mock("../../../api/trimet/routeConfig");
vi.mock("../../../api/mapbox/walking");

describe("NearbySimpleRoutes", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.mocked(getArrivals).mockReset();
    vi.mocked(getRouteById).mockReset();
    vi.mocked(getWalkingEstimates).mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("omits a route number prefix from the route name", async () => {
    vi.mocked(getArrivals).mockResolvedValue(response([]));
    const prefixedStops = {
      ...nearbyStops,
      location: nearbyStops.location.map((nearbyStop) => ({
        ...nearbyStop,
        route: [{ ...route, desc: "54-Beaverton" }],
      })),
    };

    await act(async () =>
      root.render(
        <MemoryRouter>
          <NearbySimpleRoutes
            nearbyStops={prefixedStops}
            currentLocation={[0, 0]}
            radiusSize={1000}
            handleSimpleRoutesOpened={vi.fn()}
            handleRadiusSelectionChange={vi.fn()}
            routeCount={1}
            stopCount={2}
          />
        </MemoryRouter>
      )
    );

    const heading = container.querySelector(".transit-simple-route-heading");
    expect(heading.querySelector("strong")?.textContent).toBe("54");
    expect(heading.querySelector("span[title]")?.textContent).toBe(
      "Beaverton"
    );
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
    vi.mocked(getArrivals).mockResolvedValue(response([]));
    vi.mocked(getRouteById).mockResolvedValue({
      route: [{
        route: 54, id: 54, desc: "Beaverton", type: "bus",
        routeColor: "", routeSortOrder: 54,
        dir: [
          { dir: 0, desc: "Northbound", stop: [{ ...stop(101, 0.01), seq: 1, tp: false }] },
          { dir: 1, desc: "Southbound", stop: [{ ...stop(102, 0.02), seq: 1, tp: false }] }
        ]
      }]
    });
    const cleanupMap = vi.fn();
    const onRouteInfoChanged = vi.fn(() => cleanupMap);
    await act(async () =>
      root.render(
        <MemoryRouter>
          <NearbySimpleRoutes
            nearbyStops={directionalStops}
            currentLocation={[0, 0]}
            radiusSize={1000}
            handleSimpleRoutesOpened={vi.fn()}
            handleRadiusSelectionChange={vi.fn()}
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
    const info = container.querySelector<HTMLAnchorElement>(".transit-simple-route-details-link");
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
    expect(container.querySelector("output")?.textContent).toBe("/?route=54");
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

  it.each(["", "abc", "-1", "0", "999999999999999999999", "54&route=12"])(
    "reports an invalid route query %s without requesting it", async (query) => {
      await act(async () => root.render(
        <MemoryRouter initialEntries={[`/nearby/simple-routes?route=${query}&keep=yes`]}>
          <NearbySimpleRoutes nearbyStops={{ location: [], queryTime: "" }}
            currentLocation={[0, 0]} radiusSize={1000} handleSimpleRoutesOpened={vi.fn()}
            handleRadiusSelectionChange={vi.fn()} routeCount={0} stopCount={0} />
          <CurrentLocation />
        </MemoryRouter>
      ));
      expect(container.querySelector('[role="alert"]')?.textContent).toContain("Invalid route number");
      expect(getRouteById).not.toHaveBeenCalled();
      await act(async () => Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Close").click());
      expect(container.querySelector("output")?.textContent).toBe("/nearby/simple-routes?keep=yes");
    }
  );

  it("highlights the exact stop on hover and focus and clears hidden or removed rows", async () => {
    vi.mocked(getArrivals).mockResolvedValue(response([]));
    const onStopHighlightChanged = vi.fn();
    async function renderList(data = nearbyStops) {
      await act(async () => root.render(
        <MemoryRouter>
          <NearbySimpleRoutes
            nearbyStops={data}
            currentLocation={[0, 0]}
            radiusSize={1000}
            handleSimpleRoutesOpened={vi.fn()}
            handleRadiusSelectionChange={vi.fn()}
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
    vi.mocked(getArrivals).mockRejectedValueOnce(new Error("Offline"));
    await act(async () =>
      root.render(
        <MemoryRouter>
          <NearbySimpleRoutes
            nearbyStops={nearbyStops}
            currentLocation={[0, 0]}
            radiusSize={1000}
            handleSimpleRoutesOpened={vi.fn()}
            handleRadiusSelectionChange={vi.fn()}
            routeCount={1}
            stopCount={2}
          />
        </MemoryRouter>
      )
    );

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Nearby arrivals could not be loaded."
    );

    vi.mocked(getArrivals).mockResolvedValue(response([]));
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
    vi.mocked(getArrivals).mockResolvedValue(
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
            handleSimpleRoutesOpened={vi.fn()}
            handleRadiusSelectionChange={vi.fn()}
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
