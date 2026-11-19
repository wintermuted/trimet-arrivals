import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { RouteDataResultSet } from "../api/trimet/interfaces/routes";
import { getAllRoutes, getRouteByIdAndDirection } from "../api/trimet/routeConfig";
import { getArrivals } from "../api/trimet/arrivals";
import { arrival1 } from "../api/trimet/fixture/arrival";
import NearbyDirections from "../view/nearby/components/NearbyDirections";

jest.mock("../api/trimet/routeConfig");
jest.mock("../api/trimet/arrivals");
const loadRoute = jest.mocked(getRouteByIdAndDirection);
const loadAllRoutes = jest.mocked(getAllRoutes);
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

describe("route-aware destination selection", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onSelectionChanged = jest.fn();
  const onStopHighlightChanged = jest.fn();

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

  function searchDestinations(value: string) {
    const input = container.querySelector<HTMLInputElement>('#trip-destination-options input[type="search"]');
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  it("truncates the route title without changing its subtitle or back link", async () => {
    const name = "54 Example route with a long descriptive name";
    loadRoute.mockResolvedValueOnce({ route: [{ ...route.route[0], desc: name }] });
    await render();
    const title = container.querySelector<HTMLHeadingElement>("header h3");
    expect(title.textContent).toBe(name);
    expect(title.title).toBe(name);
    expect(title.classList.contains("transit-detail-title-truncated")).toBe(true);
    expect(container.querySelector("header .transit-detail-subtitle").textContent).toBe("To Example Terminal");
    expect(container.querySelector('header a[aria-label="Back"]').getAttribute("href"))
      .toBe("/nearby/simple-routes/54?stop=101&direction=1");
    chooseDestination("102");
    expect(container.querySelector("header .transit-detail-subtitle").textContent).toBe("To Example Middle");
  });

  it("orders downstream choices and keeps destination, map focus and arrivals in sync", async () => {
    await render();
    expect(loadRoute).toHaveBeenCalledWith(54, 1);
    expect(container.querySelector("header h3").textContent).toBe("54 Example route");
    expect(container.querySelector("header .transit-detail-subtitle").textContent).toBe("To Example Terminal");
    expect(container.querySelector(".transit-directions > div > h4")).toBeNull();
    expect(container.querySelector("#trip-origin")).toBeNull();
    expect(container.querySelector(".transit-boarding-stop").textContent).toContain("Board atExample First (101)");
    expect(container.querySelector(".transit-boarding-stop a").getAttribute("href")).toBe(
      "/nearby/simple-routes/54?stop=101&direction=1"
    );
    const destination = container.querySelector<HTMLButtonElement>("#trip-destination");
    expect(container.querySelector("select")).toBeNull();
    expect(onSelectionChanged).toHaveBeenLastCalledWith(
      { routeId: 54, direction: 1, origin: stops[0], destination: undefined, destinationStops: stops.slice(1), onChooseDestination: expect.any(Function) },
      expect.any(Function)
    );
    const mapUpdates = onSelectionChanged.mock.calls.length;
    openDestinations();
    expect(onSelectionChanged).toHaveBeenCalledTimes(mapUpdates);
    expect(container.querySelector("#trip-destination-options")).not.toBeNull();
    expect(document.querySelector("dialog")).toBeNull();
    expect(Array.from(document.querySelectorAll("[data-stop-id]")).map(option => option.getAttribute("data-stop-id")))
      .toEqual(["102", "103"]);
    expect(onSelectionChanged).toHaveBeenLastCalledWith(
      { routeId: 54, direction: 1, origin: stops[0], destination: undefined, destinationStops: stops.slice(1), onChooseDestination: expect.any(Function) },
      expect.any(Function)
    );
    chooseDestination("103");
    expect(container.querySelector(".scrollarea").classList.contains("transit-directions-picking")).toBe(false);
    expect(container.querySelector("#trip-destination-options")).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toBe("2 stops to Example Terminal.");
    expect(container.querySelector("output").textContent).toContain("from=101&to=103");
    expect(onSelectionChanged).toHaveBeenLastCalledWith(
      { routeId: 54, direction: 1, origin: stops[0], destination: stops[2], destinationStops: stops.slice(1), onChooseDestination: expect.any(Function) },
      expect.any(Function)
    );
    expect(container.querySelector(".wm-btn-primary").getAttribute("href")).toBe(
      "/nearby/directions/arrivals?route=54&direction=1&from=101&to=103"
    );

    chooseDestination("102");
    expect(onSelectionChanged).toHaveBeenLastCalledWith(
      { routeId: 54, direction: 1, origin: stops[0], destination: stops[1], destinationStops: stops.slice(1), onChooseDestination: expect.any(Function) },
      expect.any(Function)
    );
    expect(destination.textContent).toBe("Example Middle (102)");
    expect(container.querySelector("header .transit-detail-subtitle").textContent).toBe("To Example Middle");
    expect(container.querySelector("output").textContent).toContain("from=101&to=102");
    expect(container.querySelector('[role="status"]').textContent).toBe("1 stop to Example Middle.");
    expect(loadRoute).toHaveBeenCalledTimes(1);
  });

  it("restores a valid selection from the URL", async () => {
    await render("route=54&direction=1&from=101&to=102");
    expect(container.querySelector("#trip-destination").textContent).toBe("Example Middle (102)");
    expect(onSelectionChanged).toHaveBeenLastCalledWith(
      { routeId: 54, direction: 1, origin: stops[0], destination: stops[1], destinationStops: stops.slice(1), onChooseDestination: expect.any(Function) },
      expect.any(Function)
    );
  });

  it("uses a map stop choice as the destination without changing the route or boarding stop", async () => {
    await render("route=54&direction=1&from=101&to=103");
    openDestinations();
    const [selection] = onSelectionChanged.mock.calls.slice(-1)[0];
    expect(selection.showDestinationChoices).toBe(true);
    expect(selection.destinationStops).toEqual(stops.slice(1));
    act(() => selection.onChooseDestination(stops[1]));
    expect(container.querySelector("#trip-destination-options")).toBeNull();
    expect(onSelectionChanged.mock.calls.slice(-1)[0][0].showDestinationChoices).toBeUndefined();
    expect(container.querySelector("#trip-destination").textContent).toBe("Example Middle (102)");
    expect(container.querySelector("output").textContent).toContain("route=54&direction=1&from=101&to=102");
  });

  it("links pointer and keyboard stop highlights without redrawing the route, clearing on search and dismissal", async () => {
    await render("route=54&direction=1&from=102&to=103");
    await act(async () => openDestinations());
    expect(Array.from(container.querySelectorAll("[data-stop-id]"))
      .map(row => row.getAttribute("data-stop-id"))).toEqual(["103"]);
    expect(onSelectionChanged).toHaveBeenLastCalledWith(
      { routeId: 54, direction: 1, origin: stops[1], destination: stops[2], destinationStops: [stops[2]], showDestinationChoices: true, onChooseDestination: expect.any(Function) },
      expect.any(Function)
    );
    const selections = onSelectionChanged.mock.calls.length;
    const terminal = container.querySelector<HTMLButtonElement>('[data-stop-id="103"]');
    act(() => terminal.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })));
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith(103);
    act(() => terminal.dispatchEvent(new MouseEvent("mouseout", { bubbles: true })));
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith(undefined);
    act(() => terminal.focus());
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith(103);
    act(() => terminal.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })));
    act(() => terminal.dispatchEvent(new MouseEvent("mouseout", { bubbles: true })));
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith(103);
    act(() => terminal.blur());
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith(undefined);
    act(() => terminal.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })));
    searchDestinations("not a stop");
    expect(container.querySelector("[data-stop-id]")).toBeNull();
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith();
    expect(onSelectionChanged).toHaveBeenCalledTimes(selections);
    act(() => container.querySelector<HTMLInputElement>('input[type="search"]')
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(onStopHighlightChanged).toHaveBeenLastCalledWith();
    expect(onSelectionChanged).toHaveBeenCalledTimes(selections + 1);
    expect(onSelectionChanged).toHaveBeenLastCalledWith(
      { routeId: 54, direction: 1, origin: stops[1], destination: stops[2], destinationStops: [stops[2]], onChooseDestination: expect.any(Function) },
      expect.any(Function)
    );
  });

  it("shows other routes at exact downstream stops and searches by connecting route", async () => {
    loadAllRoutes.mockResolvedValueOnce({
      route: [
        ...route.route,
        connectingRoute,
        { ...connectingRoute, route: 208, dir: [{ ...connectingRoute.dir[0], stop: undefined }] }
      ]
    });
    await render("route=54&direction=1&from=101&to=103");
    expect(loadAllRoutes).not.toHaveBeenCalled();
    await act(async () => openDestinations());
    const middle = document.querySelector('[data-stop-id="102"]');
    const terminal = document.querySelector('[data-stop-id="103"]');
    const connection = middle.querySelector(".wm-badge");
    expect(connection.textContent).toBe("12");
    expect(connection.getAttribute("title")).toBe("12 Example Crosstown");
    expect(connection.getAttribute("aria-label")).toBe("12 Example Crosstown");
    expect(middle.querySelectorAll(".wm-badge")).toHaveLength(1);
    expect(middle.textContent).not.toContain("54 Example route");
    expect(terminal.textContent).toContain("None reported at this stop");
    expect(terminal.textContent).not.toContain("12 Example Crosstown");
    expect(terminal.getAttribute("aria-pressed")).toBe("true");

    searchDestinations("Crosstown");
    expect(document.querySelector('[data-stop-id="102"]')).not.toBeNull();
    expect(document.querySelector('[data-stop-id="103"]')).toBeNull();
    chooseDestination("102");
    expect(container.querySelector("#trip-destination-options")).toBeNull();
    expect(container.querySelector("output").textContent).toContain("from=101&to=102");
    expect(container.querySelector("header .transit-detail-subtitle").textContent).toBe("To Example Middle");
  });

  it.each(["Cancel", "Escape", "toggle"])("collapses with %s without changing selection and restores focus", async method => {
    await render("route=54&direction=1&from=101&to=103");
    const trigger = container.querySelector<HTMLButtonElement>("#trip-destination");
    trigger.focus();
    await act(async () => openDestinations());
    const input = container.querySelector<HTMLInputElement>('input[type="search"]');
    expect(document.activeElement).toBe(input);
    await act(async () => {
      if (method === "Escape") {
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      } else if (method === "toggle") {
        trigger.click();
      } else {
        const cancel = Array.from(container.querySelectorAll<HTMLButtonElement>("#trip-destination-options button"))
          .find(button => button.textContent === "Cancel");
        cancel.click();
      }
    });
    expect(container.querySelector("#trip-destination-options")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(container.querySelector(".scrollarea").classList.contains("transit-directions-picking")).toBe(false);
    expect(container.querySelector("output").textContent).toContain("from=101&to=103");
    await act(async () => openDestinations());
    expect(loadAllRoutes).toHaveBeenCalledTimes(1);
  });

  it.each(["network failure", "invalid response"])("reports %s for other routes and supports retry", async reason => {
    if (reason === "network failure") {
      loadAllRoutes.mockRejectedValueOnce(new Error("Offline"));
    } else {
      loadAllRoutes.mockResolvedValueOnce({ route: [] });
    }
    await render();
    await act(async () => openDestinations());
    expect(container.querySelector('#trip-destination-options [role="alert"]').textContent).toContain("Could not load other routes");
    expect(document.querySelector<HTMLButtonElement>('[data-stop-id="102"]').disabled).toBe(false);
    expect(container.querySelector("#trip-destination-options .wm-badge")).toBeNull();
    const retry = Array.from(container.querySelectorAll<HTMLButtonElement>("#trip-destination-options button"))
      .find(button => button.textContent === "Retry routes");
    await act(async () => retry.click());
    expect(loadAllRoutes).toHaveBeenCalledTimes(2);
    expect(container.querySelector('#trip-destination-options [role="alert"]')).toBeNull();
    expect(document.querySelector('[data-stop-id="102"] .wm-badge').getAttribute("title"))
      .toBe("12 Example Crosstown");
    chooseDestination("102");
    expect(container.querySelector("output").textContent).toContain("from=101&to=102");
  });

  it("allows stop selection before other-route data loads and ignores its late response", async () => {
    let resolveRoutes: (data: RouteDataResultSet) => void;
    loadAllRoutes.mockImplementationOnce(() => new Promise(resolve => { resolveRoutes = resolve; }));
    await render();
    openDestinations();
    expect(container.querySelector('#trip-destination-options [role="status"]').textContent).toContain("Loading other routes");
    chooseDestination("103");
    await act(async () => resolveRoutes({ route: [...route.route, connectingRoute] }));
    expect(container.querySelector("#trip-destination-options")).toBeNull();
    expect(container.querySelector("output").textContent).toContain("from=101&to=103");
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

    chooseDestination("102");
    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelector("output").textContent).toContain("from=101&to=102");
  });

  it("requires a valid downstream pair for a direct trip-times URL", async () => {
    await render("route=54&direction=1&from=102&to=101", true);
    expect(container.querySelector('[role="alert"]').textContent).toContain("downstream destination");
    expect(container.querySelector(".wm-btn-primary").textContent).toBe("Choose stops");
    expect(container.querySelector("table")).toBeNull();
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
    expect(container.querySelector("table")).toBeNull();
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
    const clearOrigin = jest.fn();
    const clearDestination = jest.fn();
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
