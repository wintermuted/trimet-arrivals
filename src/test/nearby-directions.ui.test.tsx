import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { RouteDataResultSet } from "../api/trimet/interfaces/routes";
import { getRouteByIdAndDirection } from "../api/trimet/routeConfig";
import { getArrivals } from "../api/trimet/arrivals";
import { arrival1 } from "../api/trimet/fixture/arrival";
import NearbyDirections from "../view/nearby/components/NearbyDirections";

jest.mock("../api/trimet/routeConfig");
jest.mock("../api/trimet/arrivals");
const loadRoute = jest.mocked(getRouteByIdAndDirection);
const loadArrivals = jest.mocked(getArrivals);
const stops = [
  { locid: 101, seq: 10, desc: "Example First", dir: "E", tp: true, lat: 0, lng: 0 },
  { locid: 102, seq: 20, desc: "Example Middle", dir: "E", tp: false, lat: 1, lng: 1 },
  { locid: 103, seq: 30, desc: "Example Terminal", dir: "E", tp: true, lat: 2, lng: 2 }
];
const route: RouteDataResultSet = {
  route: [{
    route: 54,
    id: 54,
    desc: "54 Example route",
    routeColor: "000000",
    routeSortOrder: 54,
    type: "B",
    dir: [{ dir: 1, desc: "To Example Terminal", stop: [stops[2], stops[0], stops[1]] }]
  }]
};

function NavigationProbe() {
  const navigate = useNavigate();
  return (
    <>
      <output>{useLocation().search}</output>
      <button onClick={() => navigate("/nearby/directions?route=12&direction=0&from=201")}>
        Another route
      </button>
    </>
  );
}

describe("route-aware destination selection", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onSelectionChanged = jest.fn();

  beforeEach(() => {
    loadRoute.mockReset();
    loadRoute.mockResolvedValue(route);
    loadArrivals.mockReset();
    loadArrivals.mockResolvedValue({
      arrival: [], queryTime: String(Date.now()), location: [], detour: []
    });
    onSelectionChanged.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function render(query = "route=54&direction=1&from=101", showTripTimes = false) {
    await act(async () => root.render(
      <MemoryRouter initialEntries={[`/nearby/directions?${query}`]}>
        <NearbyDirections onSelectionChanged={onSelectionChanged} showTripTimes={showTripTimes} />
        <NavigationProbe />
      </MemoryRouter>
    ));
  }

  function choose(id: string, value: string) {
    const select = container.querySelector<HTMLSelectElement>(`#${id}`);
    act(() => {
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  it("orders downstream choices and keeps destination, map focus and arrivals in sync", async () => {
    await render();
    expect(loadRoute).toHaveBeenCalledWith(54, 1);
    const destination = container.querySelector<HTMLSelectElement>("#trip-destination");
    expect(Array.from(destination.options).map(option => option.value)).toEqual(["", "102", "103"]);
    expect(onSelectionChanged).toHaveBeenLastCalledWith(
      { routeId: 54, direction: 1, origin: stops[0], destination: undefined },
      expect.any(Function)
    );
    choose("trip-destination", "103");
    expect(container.querySelector('[role="status"]').textContent).toBe("2 stops to Example Terminal.");
    expect(container.querySelector("output").textContent).toContain("from=101&to=103");
    expect(onSelectionChanged).toHaveBeenLastCalledWith(
      { routeId: 54, direction: 1, origin: stops[0], destination: stops[2] },
      expect.any(Function)
    );
    expect(container.querySelector(".wm-btn-primary").getAttribute("href")).toBe(
      "/nearby/directions/arrivals?route=54&direction=1&from=101&to=103"
    );

    choose("trip-origin", "102");
    expect(onSelectionChanged).toHaveBeenLastCalledWith(
      { routeId: 54, direction: 1, origin: stops[1], destination: undefined },
      expect.any(Function)
    );
    expect(destination.value).toBe("");
    expect(container.querySelector("output").textContent).not.toContain("to=");
    expect(Array.from(destination.options).map(option => option.value)).toEqual(["", "103"]);
    expect(container.querySelector(".wm-btn-primary")).toBeNull();
    choose("trip-destination", "103");
    expect(container.querySelector('[role="status"]').textContent).toBe("1 stop to Example Terminal.");
    expect(loadRoute).toHaveBeenCalledTimes(1);
  });

  it("restores a valid selection from the URL", async () => {
    await render("route=54&direction=1&from=101&to=102");
    expect(container.querySelector<HTMLSelectElement>("#trip-destination").value).toBe("102");
    expect(onSelectionChanged).toHaveBeenLastCalledWith(
      { routeId: 54, direction: 1, origin: stops[0], destination: stops[1] },
      expect.any(Function)
    );
  });

  it("shows corresponding departure and arrival times directly below the selected stops", async () => {
    const departureAt = Date.now() + 10 * 60000;
    const arrivalAt = departureAt + 14 * 60000;
    const departure = {
      ...arrival1, id: "board", route: 54, dir: 1, locid: 101,
      tripID: "selected-trip", status: "estimated",
      estimated: departureAt, scheduled: departureAt, dropOffOnly: false
    };
    loadArrivals.mockResolvedValueOnce({
      arrival: [
        departure,
        { ...departure, id: "destination", locid: 103, estimated: arrivalAt, dropOffOnly: true },
        { ...departure, id: "unrelated", locid: 103, tripID: "another-trip", estimated: departureAt + 60000 }
      ],
      queryTime: String(Date.now()), location: [], detour: []
    });
    await render("route=54&direction=1&from=101&to=103");
    expect(loadArrivals).toHaveBeenCalledWith("101,103", 60);
    expect(container.textContent).toContain("Departure and arrival times");
    const times = Array.from(container.querySelectorAll("tbody time"));
    expect(times.map(time => time.getAttribute("datetime"))).toEqual([
      new Date(departureAt).toISOString(),
      new Date(arrivalAt).toISOString()
    ]);
    expect(container.querySelector("tbody").textContent).toContain("14 min");
    expect(container.querySelector("tbody").textContent).toContain("Estimated");
    expect(container.querySelectorAll(".scrollarea")).toHaveLength(1);

    choose("trip-origin", "102");
    expect(container.querySelector("table")).toBeNull();
    expect(container.textContent).not.toContain("Departure and arrival times");
  });

  it("requires a valid downstream pair for a direct trip-times URL", async () => {
    await render("route=54&direction=1&from=102&to=101", true);
    expect(container.querySelector('[role="alert"]').textContent).toContain("downstream destination");
    expect(container.querySelector(".wm-btn-primary").textContent).toBe("Choose stops");
    expect(container.querySelector("table")).toBeNull();
  });

  it("cleans up the previous selected-stop marker when selection changes or the view closes", async () => {
    const clearOrigin = jest.fn();
    const clearDestination = jest.fn();
    onSelectionChanged.mockReturnValueOnce(clearOrigin).mockReturnValueOnce(clearDestination);
    await render();
    choose("trip-destination", "103");
    expect(clearOrigin).toHaveBeenCalledTimes(1);
    act(() => root.render(null));
    expect(clearDestination).toHaveBeenCalledTimes(1);
  });

  it("lets users recover from an unknown origin and explains terminal stops", async () => {
    await render("route=54&direction=1&from=999");
    expect(container.querySelector('[role="alert"]').textContent).toContain("Select a boarding stop");
    expect(onSelectionChanged).not.toHaveBeenCalled();
    choose("trip-origin", "103");
    expect(container.querySelector<HTMLSelectElement>("#trip-destination").disabled).toBe(true);
    expect(container.querySelector('[role="status"]').textContent).toContain("last stop");
    expect(onSelectionChanged).toHaveBeenLastCalledWith(
      { routeId: 54, direction: 1, origin: stops[2], destination: undefined },
      expect.any(Function)
    );
  });

  it("rejects destinations before the origin rather than inventing a journey", async () => {
    await render("route=54&direction=1&from=102&to=101");
    expect(container.querySelector('[role="alert"]').textContent).toContain("after your boarding stop");
    expect(container.querySelector(".wm-btn-primary")).toBeNull();
    expect(onSelectionChanged).toHaveBeenLastCalledWith(
      { routeId: 54, direction: 1, origin: stops[1], destination: undefined },
      expect.any(Function)
    );
  });

  it("does not fetch an invalid route or direction", async () => {
    await render("route=54&direction=2&from=101");
    expect(loadRoute).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]').textContent).toContain("Choose a route and direction");
  });

  it.each(["network failure", "no route stops"])("shows a recoverable error for %s", async reason => {
    if (reason === "network failure") {
      loadRoute.mockRejectedValueOnce(new Error("Offline"));
    } else {
      loadRoute.mockResolvedValueOnce({ route: [] });
    }
    await render();
    expect(container.querySelector('[role="alert"]').textContent).toContain("Could not load stops");
    await act(async () => container.querySelector<HTMLButtonElement>(".wm-btn").click());
    expect(loadRoute).toHaveBeenCalledTimes(2);
    expect(container.querySelector("#trip-origin")).not.toBeNull();
  });

  it("ignores an old route response after navigating to another route", async () => {
    let resolveOld: (result: RouteDataResultSet) => void;
    loadRoute.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    await render();
    expect(container.querySelector('[role="status"]').textContent).toBe("Loading route stops...");
    loadRoute.mockResolvedValueOnce({
      route: [{
        ...route.route[0],
        route: 12,
        desc: "12 Another route",
        dir: [{ dir: 0, desc: "To Another Terminal", stop: [{ ...stops[0], locid: 201 }] }]
      }]
    });
    await act(async () => container.querySelector<HTMLButtonElement>("button").click());
    await act(async () => resolveOld(route));
    expect(container.textContent).toContain("12 Another route");
    expect(container.textContent).not.toContain("54 Example route");
    expect(onSelectionChanged).toHaveBeenLastCalledWith(
      {
        routeId: 12,
        direction: 0,
        origin: { ...stops[0], locid: 201 },
        destination: undefined
      },
      expect.any(Function)
    );
  });

  it("reports route-line failures without losing stop selections and retries the map", async () => {
    onSelectionChanged.mockImplementationOnce((selection, onError) => onError());
    await render("route=54&direction=1&from=101&to=103");
    expect(container.querySelector('[role="alert"]').textContent).toContain("Could not load the route line");
    expect(container.querySelector<HTMLSelectElement>("#trip-destination").value).toBe("103");
    const retry = Array.from(container.querySelectorAll("button")).find(button => button.textContent === "Retry map");
    act(() => retry.click());
    expect(onSelectionChanged).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
