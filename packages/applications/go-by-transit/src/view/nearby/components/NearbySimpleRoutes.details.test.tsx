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

describe("NearbySimpleRoutes route details", () => {
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

  it("opens route info in the URL and follows browser back and forward", async () => {
    vi.mocked(getArrivals).mockResolvedValue(response([]));
    vi.mocked(getRouteById).mockResolvedValue({
      route: [{
        route: 54, id: 54, desc: "Beaverton", type: "bus",
        routeColor: "", routeSortOrder: 54,
        dir: [{ dir: 0, desc: "Northbound", stop: [{ ...stop(101, 0.01), seq: 1, tp: false }] }]
      }]
    });
    const cleanupMap = vi.fn();
    const showMap = vi.fn(() => cleanupMap);
    await act(async () => root.render(
      <MemoryRouter initialEntries={["/nearby/simple-routes?keep=yes"]}>
        <NearbySimpleRoutes nearbyStops={nearbyStops} currentLocation={[0, 0]} radiusSize={1000}
          handleSimpleRoutesOpened={vi.fn()} handleRadiusSelectionChange={vi.fn()}
          routeCount={1} stopCount={2} onRouteInfoChanged={showMap} />
        <CurrentLocation /><BrowserHistory />
      </MemoryRouter>
    ));
    const info = container.querySelector<HTMLAnchorElement>(".transit-simple-route-details-link");
    expect(info.getAttribute("href")).toBe("/nearby/simple-routes?keep=yes&route=54");
    await act(async () => info.click());
    expect(container.querySelector("output")?.textContent).toBe("/nearby/simple-routes?keep=yes&route=54");
    expect(container.querySelector('[aria-label="Route 54 details"]')).not.toBeNull();
    const buttons = Array.from(container.querySelectorAll("button"));
    await act(async () => buttons.find((button) => button.textContent === "Browser back").click());
    expect(container.querySelector("output")?.textContent).toBe("/nearby/simple-routes?keep=yes");
    expect(container.querySelector('[aria-label="Route 54 details"]')).toBeNull();
    expect(cleanupMap).toHaveBeenCalledTimes(1);
    await act(async () => buttons.find((button) => button.textContent === "Browser forward").click());
    expect(container.querySelector('[aria-label="Route 54 details"]')).not.toBeNull();
    expect(showMap).toHaveBeenCalledTimes(2);
    await act(async () => Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Close").click());
    expect(container.querySelector("output")?.textContent).toBe("/nearby/simple-routes?keep=yes");
    expect(cleanupMap).toHaveBeenCalledTimes(2);
  });

  it("loads a deep-linked route even when it is not in the nearby stops", async () => {
    vi.mocked(getRouteById).mockResolvedValue({
      route: [{
        route: 12, id: 12, desc: "Sandy", type: "bus",
        routeColor: "", routeSortOrder: 12,
        dir: [{ dir: 0, desc: "Eastbound", stop: [{ ...stop(101, 0.01), seq: 1, tp: false }] }]
      }]
    });
    const showMap = vi.fn(() => vi.fn());
    await act(async () => root.render(
      <MemoryRouter initialEntries={["/nearby/simple-routes?route=12&keep=yes"]}>
        <NearbySimpleRoutes nearbyStops={{ location: [], queryTime: "" }}
          currentLocation={[0, 0]} radiusSize={1000} handleSimpleRoutesOpened={vi.fn()}
          handleRadiusSelectionChange={vi.fn()} routeCount={0} stopCount={0}
          onRouteInfoChanged={showMap} />
        <CurrentLocation />
      </MemoryRouter>
    ));
    expect(getRouteById).toHaveBeenCalledWith(12);
    expect(container.querySelector('[aria-label="Route 12 details"]')?.textContent).toContain("Route 12: Sandy");
    expect(showMap).toHaveBeenCalledTimes(1);
    await act(async () => Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Close").click());
    expect(container.querySelector("output")?.textContent).toBe("/nearby/simple-routes?keep=yes");
  });

  it("ignores an earlier route response after the query changes", async () => {
    let resolveFirst: (value: any) => void;
    vi.mocked(getRouteById)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({
        route: [{
          route: 12, id: 12, desc: "Sandy", type: "bus",
          routeColor: "", routeSortOrder: 12,
          dir: [{ dir: 0, desc: "Eastbound", stop: [{ ...stop(102, 0.02), seq: 1, tp: false }] }]
        }]
      });
    const showMap = vi.fn(() => vi.fn());
    await act(async () => root.render(
      <MemoryRouter initialEntries={["/nearby/simple-routes?route=54"]}>
        <NearbySimpleRoutes nearbyStops={{ location: [], queryTime: "" }}
          currentLocation={[0, 0]} radiusSize={1000} handleSimpleRoutesOpened={vi.fn()}
          handleRadiusSelectionChange={vi.fn()} routeCount={0} stopCount={0}
          onRouteInfoChanged={showMap} />
        <BrowserHistory />
      </MemoryRouter>
    ));
    await act(async () => Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Open route 12").click());
    await act(async () => resolveFirst({
      route: [{
        route: 54, id: 54, desc: "Beaverton", type: "bus", routeColor: "", routeSortOrder: 54,
        dir: [{ dir: 0, desc: "Northbound", stop: [{ ...stop(101, 0.01), seq: 1, tp: false }] }]
      }]
    }));
    expect(container.querySelector('[aria-label="Route 12 details"]')?.textContent).toContain("Sandy");
    expect(container.querySelector('[aria-label="Route 54 details"]')).toBeNull();
    expect(showMap).toHaveBeenCalledTimes(1);
    expect(showMap.mock.calls[0][0].route).toBe(12);
  });

  it("collapses route directions independently and highlights hovered or focused stops", async () => {
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
    const highlight = vi.fn();
    await act(async () => root.render(
      <MemoryRouter>
        <NearbySimpleRoutes nearbyStops={nearbyStops} currentLocation={[0, 0]} radiusSize={1000}
          handleSimpleRoutesOpened={vi.fn()} handleRadiusSelectionChange={vi.fn()}
          routeCount={1} stopCount={2} onRouteInfoStopHighlighted={highlight} />
      </MemoryRouter>
    ));
    await act(async () => container.querySelector<HTMLAnchorElement>(".transit-simple-route-details-link").click());
    const panel = container.querySelector('[aria-label="Route 54 details"]');
    const directions = Array.from(panel.querySelectorAll<HTMLDetailsElement>("details"));
    const first = directions[0].querySelector<HTMLElement>('[data-stop-id="101"]');
    const second = directions[1].querySelector<HTMLElement>('[data-stop-id="102"]');
    expect(directions.map((direction) => direction.open)).toEqual([true, true]);
    highlight.mockClear();
    await act(async () => first.focus());
    expect(highlight).toHaveBeenLastCalledWith(101);
    await act(async () => second.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })));
    expect(highlight).toHaveBeenLastCalledWith(102);
    await act(async () => second.dispatchEvent(new MouseEvent("mouseout", { bubbles: true })));
    expect(highlight).toHaveBeenLastCalledWith(101);
    await act(async () => {
      directions[0].open = false;
      directions[0].dispatchEvent(new Event("toggle"));
    });
    expect(directions[1].open).toBe(true);
    expect(highlight).toHaveBeenLastCalledWith();
    await act(async () => {
      const close = Array.from(panel.querySelectorAll("button")).find((button) => button.textContent === "Close");
      close.click();
    });
    expect(highlight).toHaveBeenLastCalledWith();
  });

  it("opens the selected route stop from the details list", async () => {
    vi.mocked(getArrivals).mockResolvedValue(response([]));
    vi.mocked(getRouteById).mockResolvedValue({
      route: [{
        route: 54, id: 54, desc: "Beaverton", type: "bus",
        routeColor: "", routeSortOrder: 54,
        dir: [{ dir: 0, desc: "Northbound", stop: [{ ...stop(101, 0.01), seq: 1, tp: false }] }]
      }]
    });
    await act(async () => root.render(
      <MemoryRouter initialEntries={["/nearby/simple-routes?route=54&keep=yes#directions"]}>
        <NearbySimpleRoutes nearbyStops={nearbyStops} currentLocation={[0, 0]} radiusSize={1000}
          handleSimpleRoutesOpened={vi.fn()} handleRadiusSelectionChange={vi.fn()}
          routeCount={1} stopCount={2} />
        <CurrentLocation />
      </MemoryRouter>
    ));
    const stopLink = container.querySelector<HTMLAnchorElement>('[aria-label="Route 54 details"] a[data-stop-id="101"]');
    const referrer = "/nearby/simple-routes?route=54&keep=yes#directions";
    expect(stopLink.getAttribute("href")).toBe(`/nearby/stops/101?${new URLSearchParams({ referrer })}`);
    await act(async () => stopLink.click());
    expect(container.querySelector("output")?.textContent).toBe(`/nearby/stops/101?${new URLSearchParams({ referrer })}`);
  });

  it("reports route detail failures and retries without leaving the nearby list", async () => {
    vi.mocked(getArrivals).mockResolvedValue(response([]));
    vi.mocked(getRouteById)
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
          handleSimpleRoutesOpened={vi.fn()} handleRadiusSelectionChange={vi.fn()}
          routeCount={1} stopCount={2} />
      </MemoryRouter>
    ));
    await act(async () => container.querySelector<HTMLAnchorElement>(".transit-simple-route-details-link").click());
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


});
