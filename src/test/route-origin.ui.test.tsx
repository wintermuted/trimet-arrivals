import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { getArrivals } from "../api/trimet/arrivals";
import { getRouteByIdAndDirection } from "../api/trimet/routeConfig";
import { ArrivalData } from "../api/trimet/interfaces/arrivals";
import { RouteDataResultSet } from "../api/trimet/interfaces/routes";
import { arrival1 } from "../api/trimet/fixture/arrival";
import NearbySimpleRouteArrivals from "../view/nearby/components/NearbySimpleRouteArrivals";

jest.mock("../api/trimet/arrivals");
jest.mock("../api/trimet/routeConfig");
jest.mock("../view/nearby/components/common/StopsOnRoute", () => ({
  StopsOnRoute: ({ remainingStopsOnRoute }) => <p data-testid="remaining">{remainingStopsOnRoute.map(stop => stop.locid).join(",")}</p>
}));
jest.mock("../view/nearby/components/common/InfoCard", () => ({ InfoCard: () => null }));

const stops = [
  { locid: 101, seq: 1, desc: "First", dir: "E", tp: true, lat: 1, lng: 1 },
  { locid: 102, seq: 2, desc: "Middle", dir: "E", tp: true, lat: 2, lng: 2 },
  { locid: 103, seq: 3, desc: "Last", dir: "E", tp: true, lat: 3, lng: 3 }
];
const route: RouteDataResultSet = {
  route: [{ route: 54, id: 54, desc: "Example", routeColor: "", routeSortOrder: 54, type: "B",
    dir: [{ dir: 1, desc: "To Example", stop: [stops[2], stops[0], stops[1]] }] }]
};
const result = (locid: number, hasDeparture = true): ArrivalData => ({
  arrival: hasDeparture ? [{ ...arrival1, id: `arrival-${locid}`, locid, route: 54, dir: 1 }] : [],
  location: [], detour: [], queryTime: ""
});

function LocationProbe() { return <output>{useLocation().search}</output>; }

describe("route origin selection", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const map = jest.fn();
  beforeEach(() => {
    jest.mocked(getRouteByIdAndDirection).mockReset().mockResolvedValue(route);
    jest.mocked(getArrivals).mockReset().mockImplementation(async id => result(Number(id)));
    map.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  async function render() {
    await act(async () => root.render(<MemoryRouter initialEntries={["/nearby/simple-routes/54?stop=102&direction=1&extra=keep"]}>
      <Routes>
        <Route path="/nearby/simple-routes/:id" element={<NearbySimpleRouteArrivals onSelectionChanged={map} />} />
        <Route path="/nearby/directions" element={<p>Directions</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>));
  }
  async function choose(value: string) {
    const select = container.querySelector<HTMLSelectElement>("#route-origin");
    await act(async () => { select.value = value; select.dispatchEvent(new Event("change", { bubbles: true })); });
  }

  it("allows earlier and later stops, updating the URL, departures, stop actions and map", async () => {
    await render();
    const select = container.querySelector<HTMLSelectElement>("#route-origin");
    expect(Array.from(select.options).map(option => option.value)).toEqual(["", "101", "102", "103"]);
    expect(select.value).toBe("102");
    await choose("101");
    expect(container.querySelector("output").textContent).toContain("stop=101&direction=1&extra=keep");
    expect(getArrivals).toHaveBeenLastCalledWith("101", 60);
    expect(map).toHaveBeenLastCalledWith({ routeId: 54, direction: 1, origin: stops[0] }, expect.any(Function));
    expect(container.querySelector('[data-testid="remaining"]').textContent).toBe("102,103");
    expect(container.querySelector('a[href="/nearby/stops/101"]')).not.toBeNull();
    expect(container.querySelector(".transit-departure-option")).not.toBeNull();
    expect(getRouteByIdAndDirection).toHaveBeenCalledTimes(1);
    await choose("103");
    expect(container.querySelector('[data-testid="remaining"]').textContent).toBe("");
    expect(map).toHaveBeenLastCalledWith({ routeId: 54, direction: 1, origin: stops[2] }, expect.any(Function));
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Go from this stop"]').click());
    expect(container.querySelector("output").textContent).toBe("?route=54&direction=1&from=103");
  });

  it("keeps the selector available when no departures are found", async () => {
    jest.mocked(getArrivals).mockImplementation(async id =>
      id === "101" ? { ...result(101, false), arrival: undefined } : result(Number(id))
    );
    await render();
    await choose("101");
    expect(container.querySelector('[role="status"]').textContent).toContain("No upcoming departures");
    expect(container.querySelector<HTMLSelectElement>("#route-origin").value).toBe("101");
    await choose("102");
    expect(container.querySelector(".transit-departure-option")).not.toBeNull();
  });

  it("ignores an earlier stop response arriving after a later selection", async () => {
    let resolveFirst: (value: ArrivalData) => void;
    jest.mocked(getArrivals).mockImplementation(id =>
      id === "101" ? new Promise(resolve => { resolveFirst = resolve; }) : Promise.resolve(result(Number(id)))
    );
    await render();
    await choose("101");
    await choose("103");
    await act(async () => resolveFirst(result(101)));
    expect(container.querySelector<HTMLSelectElement>("#route-origin").value).toBe("103");
    expect(container.querySelector('a[href="/nearby/stops/103"]')).not.toBeNull();
    expect(container.querySelector(".transit-departure-option")).not.toBeNull();
  });

  it("reports departure failures and allows retry for the selected stop", async () => {
    jest.mocked(getArrivals).mockImplementation(async id => {
      if (id === "101") throw new Error("Offline");
      return result(Number(id));
    });
    await render();
    await choose("101");
    expect(container.querySelector('[role="alert"]').textContent).toContain("Could not load departures");
    jest.mocked(getArrivals).mockResolvedValue(result(101));
    const retry = Array.from(container.querySelectorAll("button")).find(button => button.textContent === "Try again");
    await act(async () => retry.click());
    expect(container.querySelector(".transit-departure-option")).not.toBeNull();
  });
});
