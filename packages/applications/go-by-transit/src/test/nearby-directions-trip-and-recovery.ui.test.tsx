import { vi } from "vitest";
import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { RouteDataResultSet } from "../api/trimet/interfaces/routes";
import { getAllRoutes, getRouteByIdAndDirection } from "../api/trimet/routeConfig";
import { getArrivals } from "../api/trimet/arrivals";
import { arrival1 } from "../api/trimet/fixture/arrival";
import NearbyDirections from "../view/nearby/components/NearbyDirections";

vi.mock("../api/trimet/routeConfig");
vi.mock("../api/trimet/arrivals");
const loadRoute = vi.mocked(getRouteByIdAndDirection);
const loadAllRoutes = vi.mocked(getAllRoutes);
const loadArrivals = vi.mocked(getArrivals);
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
const connectingRoute = {
  ...route.route[0],
  route: 12,
  id: 12,
  desc: "12 Example Crosstown",
  dir: [
    { dir: 0, desc: "Outbound", stop: [stops[1]] },
    { dir: 1, desc: "Inbound", stop: [stops[1], { ...stops[2], locid: 999 }] }
  ]
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

describe("Directions trip times, deep links and recovery", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onSelectionChanged = vi.fn();
  const onStopHighlightChanged = vi.fn();

  beforeEach(() => {
    loadRoute.mockReset();
    loadRoute.mockResolvedValue(route);
    loadAllRoutes.mockReset();
    loadAllRoutes.mockResolvedValue({ route: [...route.route, connectingRoute] });
    loadArrivals.mockReset();
    loadArrivals.mockResolvedValue({
      arrival: [], queryTime: String(Date.now()), location: [], detour: []
    });
    onSelectionChanged.mockReset();
    onStopHighlightChanged.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function render(query = "route=54&direction=1&from=101", showTripTimes = false, showTrip = false) {
    await act(async () => root.render(
      <MemoryRouter initialEntries={[`/nearby/directions?${query}`]}>
        <NearbyDirections onSelectionChanged={onSelectionChanged} onStopHighlightChanged={onStopHighlightChanged} showTripTimes={showTripTimes} showTrip={showTrip} />
        <NavigationProbe />
      </MemoryRouter>
    ));
  }

  function openDestinations() {
    act(() => {
      container.querySelector<HTMLButtonElement>("#trip-destination").click();
    });
  }

  function chooseDestination(value: string) {
    if (!container.querySelector("#trip-destination-options")) {
      openDestinations();
      expect(container.querySelector(".scrollarea").classList.contains("transit-directions-picking")).toBe(true);
    }
    act(() => document.querySelector<HTMLButtonElement>(`[data-stop-id="${value}"]`).click());
  }


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
    const card = container.querySelector(".transit-upcoming-trips li > a");
    const times = Array.from(card.querySelectorAll("time"));
    expect(times.map(time => time.getAttribute("datetime"))).toEqual([
      new Date(departureAt).toISOString(),
      new Date(arrivalAt).toISOString()
    ]);
    expect(card.textContent).toContain("14 min");
    expect(card.textContent).toContain("Departure: Estimated");
    expect(container.querySelectorAll(".scrollarea")).toHaveLength(1);

    chooseDestination("102");
    expect(container.querySelector(".transit-upcoming-trips")).toBeNull();
    expect(container.querySelector("output").textContent).toContain("from=101&to=102");
  });

  it("requires a valid downstream pair for a direct trip-times URL", async () => {
    await render("route=54&direction=1&from=102&to=101", true);
    expect(container.querySelector('[role="alert"]').textContent).toContain("downstream destination");
    expect(container.querySelector(".wm-btn-primary").textContent).toBe("Choose stops");
    expect(container.querySelector(".transit-upcoming-trips")).toBeNull();
  });

  it("opens a selected trip from its URL with a return path to the originating list", async () => {
    const at = Date.now() + 10 * 60000;
    const selected = {
      ...arrival1, id: "selected-departure", tripID: "selected-trip",
      route: 54, dir: 1, locid: 101, estimated: at, dropOffOnly: false, status: "estimated"
    };
    loadArrivals.mockResolvedValue({
      arrival: [selected, { ...selected, id: "dest", locid: 103, estimated: at + 14 * 60000 }],
      queryTime: String(Date.now()), location: [], detour: []
    });
    await render("route=54&direction=1&from=101&to=103&departure=selected-departure&trip=selected-trip&source=arrivals", false, true);
    expect(container.textContent).toContain("Trip details");
    expect(container.textContent).toContain("Trip selected-trip");
    expect(container.querySelector("header h3").textContent).toBe("54 Example route");
    const details = container.querySelector(".transit-selected-trip");
    const [boarding, destination] = Array.from(details.querySelectorAll(".transit-planner-endpoint"));
    expect(container.querySelector(".transit-upcoming-trips")).toBeNull();
    expect(boarding.textContent).toContain("Board at");
    expect(boarding.textContent).toContain(`${stops[0].desc} (101)`);
    expect(boarding.querySelector("time").dateTime).toBe(new Date(at).toISOString());
    expect(destination.textContent).toContain("Get off at");
    expect(destination.textContent).toContain(`${stops[2].desc} (103)`);
    expect(destination.querySelector("time").dateTime).toBe(new Date(at + 14 * 60000).toISOString());
    expect(destination.textContent).toContain("Estimated");
    expect(details.textContent).toContain("14 min ride");
    expect(container.querySelector("#trip-destination")).toBeNull();
    expect(container.querySelector("header a").getAttribute("href"))
      .toBe("/nearby/directions/arrivals?route=54&direction=1&from=101&to=103");
    expect(onSelectionChanged).toHaveBeenLastCalledWith(
      { routeId: 54, direction: 1, origin: stops[0], destination: stops[2] },
      expect.any(Function)
    );
  });

  it("requires an explicit departure for a direct trip URL", async () => {
    await render("route=54&direction=1&from=101&to=103", false, true);
    expect(container.querySelector('[role="alert"]').textContent).toContain("Choose a departure");
    expect(loadArrivals).not.toHaveBeenCalled();
    expect(container.querySelector(".wm-btn-primary").getAttribute("href"))
      .toBe("/nearby/directions?route=54&direction=1&from=101&to=103");
  });

  it("cleans up the previous selected-stop marker when selection changes or the view closes", async () => {
    const clearOrigin = vi.fn();
    const clearDestination = vi.fn();
    onSelectionChanged.mockReturnValueOnce(clearOrigin).mockReturnValueOnce(clearDestination);
    await render();
    chooseDestination("103");
    expect(clearOrigin).toHaveBeenCalledTimes(1);
    act(() => root.render(null));
    expect(clearDestination).toHaveBeenCalledTimes(1);
  });

  it("sends users back to recover from an unknown origin without offering an origin selector", async () => {
    await render("route=54&direction=1&from=999");
    expect(container.querySelector('[role="alert"]').textContent).toContain("Go back to select a boarding stop");
    expect(onSelectionChanged).not.toHaveBeenCalled();
    expect(container.querySelector("#trip-origin")).toBeNull();
    expect(container.querySelector(".transit-boarding-stop a").getAttribute("href")).toBe("/nearby/simple-routes");
    expect(loadArrivals).not.toHaveBeenCalled();
  });

  it("sends users back from terminal stops rather than allowing origin changes here", async () => {
    await render("route=54&direction=1&from=103");
    expect(container.querySelector<HTMLButtonElement>("#trip-destination").disabled).toBe(true);
    expect(container.querySelector('[role="status"]').textContent).toContain("last stop");
    expect(container.querySelector('[role="status"]').textContent).toContain("Go back");
    expect(container.querySelector("#trip-origin")).toBeNull();
    expect(onSelectionChanged).toHaveBeenLastCalledWith(
      { routeId: 54, direction: 1, origin: stops[2], destination: undefined, destinationStops: [], onChooseDestination: expect.any(Function) },
      expect.any(Function)
    );
  });

  it("rejects destinations before the origin rather than inventing a journey", async () => {
    await render("route=54&direction=1&from=102&to=101");
    expect(container.querySelector('[role="alert"]').textContent).toContain("after your boarding stop");
    expect(container.querySelector(".wm-btn-primary")).toBeNull();
    expect(onSelectionChanged).toHaveBeenLastCalledWith(
      { routeId: 54, direction: 1, origin: stops[1], destination: undefined, destinationStops: [stops[2]], onChooseDestination: expect.any(Function) },
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
    expect(container.querySelector("#trip-destination")).not.toBeNull();
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
        destination: undefined,
        destinationStops: [],
        onChooseDestination: expect.any(Function)
      },
      expect.any(Function)
    );
  });

  it("reports route-line failures without losing stop selections and retries the map", async () => {
    onSelectionChanged.mockImplementationOnce((selection, onError) => onError());
    await render("route=54&direction=1&from=101&to=103");
    expect(container.querySelector('[role="alert"]').textContent).toContain("Could not load the route line");
    expect(container.querySelector("#trip-destination").textContent).toBe("Example Terminal (103)");
    const retry = Array.from(container.querySelectorAll("button")).find(button => button.textContent === "Retry map");
    act(() => retry.click());
    expect(onSelectionChanged).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
