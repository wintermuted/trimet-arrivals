import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { TrimetRoute } from "../../../api/trimet/interfaces/types";
import NearbyRoutes, { filterRouteGroups } from "./NearbyRoutes";

const route: TrimetRoute = {
  route: 54,
  desc: "Beaverton",
  type: "bus",
  dir: [
    { dir: 0, desc: "Northbound" },
    { dir: 1, desc: "Southbound" },
  ],
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
        routeId: 54,
        description: "Beaverton",
        directions: [
          {
            key: "54-0",
            routeId: 54,
            direction: { dir: 0, desc: "Northbound" },
          },
          {
            key: "54-1",
            routeId: 54,
            direction: { dir: 1, desc: "Southbound" },
          },
        ],
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
