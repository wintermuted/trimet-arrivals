import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { TrimetRoute } from "../../../api/trimet/interfaces/types";
import NearbyRoutes, { filterRouteGroups } from "./NearbyRoutes";

const route: TrimetRoute = {
  desc: "Beaverton",
  dir: [
    { desc: "Northbound", dir: 0 },
    { desc: "Southbound", dir: 1 },
  ],
  route: 54,
  type: "bus",
};

describe("NearbyRoutes", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("filters by route or direction without dropping a route's other direction", () => {
    const groups = [
      {
        description: "Beaverton",
        directions: [
          {
            direction: { desc: "Northbound", dir: 0 },
            key: "54-0",
            routeId: 54,
          },
          {
            direction: { desc: "Southbound", dir: 1 },
            key: "54-1",
            routeId: 54,
          },
        ],
        routeId: 54,
      },
    ];

    expect(
      filterRouteGroups(groups, ["direction:54-1"])[0].visibleDirections
    ).toEqual([groups[0].directions[1]]);
    expect(
      filterRouteGroups(groups, ["route:54"])[0].visibleDirections
    ).toEqual(groups[0].directions);
  });

  it("renders every direction with route detail and arrivals navigation", async () => {
    await act(async () =>
      root.render(
        <MemoryRouter>
          <NearbyRoutes
            nearbyRoutes={{ "54": [route] }}
            radiusSize={1000}
            handleRadiusSelectionChange={jest.fn()}
            routeCount={1}
            stopCount={2}
          />
        </MemoryRouter>
      )
    );

    expect(container.textContent).toContain("Northbound");
    expect(container.textContent).toContain("Southbound");
    expect(container.querySelector('a[href="/lines/54"]')).not.toBeNull();
    expect(
      container.querySelector('a[href="/nearby/simple-routes/54?direction=0"]')
    ).not.toBeNull();
    expect(
      container.querySelector('a[href="/nearby/simple-routes/54?direction=1"]')
    ).not.toBeNull();
  });

  it("opens the route filter controls from the filter button", async () => {
    await act(async () =>
      root.render(
        <MemoryRouter>
          <NearbyRoutes
            nearbyRoutes={{ "54": [route] }}
            radiusSize={1000}
            handleRadiusSelectionChange={jest.fn()}
            routeCount={1}
            stopCount={2}
          />
        </MemoryRouter>
      )
    );

    const filterButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button")
    ).find((button) => button.getAttribute("aria-label") === "Filter");
    const filterControl = document.getElementById("nearby-routes-filter");
    expect(filterButton?.getAttribute("aria-expanded")).toBe("false");
    expect(filterControl?.closest(".transit-route-control-popover")?.hidden).toBe(
      true
    );

    if (!filterButton || !filterControl) {
      throw new Error("The route filter controls were not rendered.");
    }
    await act(async () => filterButton.click());

    expect(filterButton.getAttribute("aria-expanded")).toBe("true");
    expect(filterControl.closest(".transit-route-control-popover")?.hidden).toBe(
      false
    );
    expect(document.activeElement).toBe(filterControl);

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "Escape" })
      );
    });

    expect(filterButton.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(filterButton);
  });

  it("explains an empty route list", async () => {
    await act(async () =>
      root.render(
        <MemoryRouter>
          <NearbyRoutes
            nearbyRoutes={{}}
            radiusSize={1000}
            handleRadiusSelectionChange={jest.fn()}
            routeCount={0}
            stopCount={0}
          />
        </MemoryRouter>
      )
    );

    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "No routes were found"
    );
  });
});
