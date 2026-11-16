import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { getArrivals } from "../api/trimet/arrivals";
import { getWalkingRoute, WalkingRoute } from "../api/mapbox/walking";
import { getRouteById, getRouteByIdAndDirection } from "../api/trimet/routeConfig";
import { ArrivalData } from "../api/trimet/interfaces/arrivals";
import { RouteDataResultSet } from "../api/trimet/interfaces/routes";
import { arrival1 } from "../api/trimet/fixture/arrival";
import NearbySimpleRouteArrivals from "../view/nearby/components/NearbySimpleRouteArrivals";

jest.mock("../api/trimet/arrivals");
jest.mock("../api/mapbox/walking");
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
function HistoryControls() {
  const navigate = useNavigate();
  return <><button onClick={() => navigate(-1)}>History back</button>
    <button onClick={() => navigate(1)}>History forward</button></>;
}

describe("route origin selection", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const map = jest.fn();
  const routeInfoMap = jest.fn();
  beforeEach(() => {
    jest.mocked(getRouteByIdAndDirection).mockReset().mockResolvedValue(route);
    jest.mocked(getRouteById).mockReset().mockResolvedValue(route);
    jest.mocked(getArrivals).mockReset().mockImplementation(async id => result(Number(id)));
    map.mockReset();
    routeInfoMap.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  async function render(
    path = "/nearby/simple-routes/54?stop=102&direction=1&extra=keep",
    onWalkingRouteChanged?: () => () => void
  ) {
    await act(async () => root.render(<MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/nearby/simple-routes/:id" element={<NearbySimpleRouteArrivals
          onSelectionChanged={map} onRouteInfoChanged={routeInfoMap}
          currentLocation={[0, 0]} walkingEnabled={!!onWalkingRouteChanged}
          onWalkingRouteChanged={onWalkingRouteChanged} />} />
        <Route path="/nearby/directions" element={<p>Directions</p>} />
      </Routes>
      <LocationProbe />
      <HistoryControls />
    </MemoryRouter>));
  }
  async function choose(value: string) {
    const select = container.querySelector<HTMLSelectElement>("#route-origin");
    await act(async () => { select.value = value; select.dispatchEvent(new Event("change", { bubbles: true })); });
  }

  it("opens route information from a truncated header and restores the stop and map", async () => {
    const cleanupSelection = jest.fn();
    const cleanupInfo = jest.fn();
    map.mockReturnValue(cleanupSelection);
    routeInfoMap.mockReturnValue(cleanupInfo);
    jest.mocked(getArrivals).mockResolvedValueOnce({
      ...result(102),
      arrival: [...result(102).arrival, { ...result(102).arrival[0], id: "another-departure" }]
    });
    await render("/nearby/simple-routes/54?stop=102&direction=1&extra=keep#stop");
    const departures = container.querySelectorAll<HTMLButtonElement>(".transit-departure-option");
    act(() => departures[1].click());
    const title = container.querySelector<HTMLHeadingElement>(".transit-detail-header h3");
    expect(title.textContent).toBe("54 to Example");
    expect(title.title).toBe("54 to Example");
    expect(title.classList.contains("transit-detail-title-truncated")).toBe(true);
    const info = container.querySelector<HTMLAnchorElement>('[aria-label="View Route 54 details"]');
    expect(info.getAttribute("href")).toBe("/nearby/simple-routes/54?stop=102&direction=1&extra=keep&route=54#stop");
    await act(async () => info.click());
    expect(container.querySelector(".transit-route-stop-content").hasAttribute("hidden")).toBe(true);
    expect(container.querySelector('[aria-label="Route 54 details"]')).not.toBeNull();
    expect(cleanupSelection).toHaveBeenCalledTimes(1);
    expect(routeInfoMap).toHaveBeenCalledWith(route.route[0], expect.any(Function));
    const stopLink = container.querySelector<HTMLAnchorElement>('.transit-route-info a[data-stop-id="101"]');
    const referrer = new URL(stopLink.getAttribute("href"), "https://local.invalid").searchParams.get("referrer");
    expect(referrer).toBe("/nearby/simple-routes/54?stop=102&direction=1&extra=keep&route=54#stop");
    const close = Array.from(container.querySelectorAll("button")).find(button => button.textContent === "Close");
    await act(async () => close.click());
    expect(cleanupInfo).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[aria-label="Route 54 details"]')).toBeNull();
    expect(container.querySelector<HTMLSelectElement>("#route-origin").value).toBe("102");
    expect(container.querySelectorAll(".transit-departure-option")[1].getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector("output").textContent).toBe("?stop=102&direction=1&extra=keep");
    expect(map).toHaveBeenCalledTimes(2);
  });

  it("removes the walking overlay while route details are open and restores it without refetching", async () => {
    const walking: WalkingRoute = {
      feature: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] } },
      meters: 200, seconds: 150, status: "ready"
    };
    const cleanupWalking = jest.fn();
    const showWalking = jest.fn(() => cleanupWalking);
    jest.mocked(getWalkingRoute).mockReset().mockResolvedValue(walking);
    await render(undefined, showWalking);
    expect(showWalking).toHaveBeenCalledTimes(1);
    await act(async () => container.querySelector<HTMLAnchorElement>('[aria-label="View Route 54 details"]').click());
    expect(cleanupWalking).toHaveBeenCalledTimes(1);
    const close = Array.from(container.querySelectorAll("button")).find(button => button.textContent === "Close");
    await act(async () => close.click());
    expect(showWalking).toHaveBeenCalledTimes(2);
    expect(getWalkingRoute).toHaveBeenCalledTimes(1);
  });

  it("supports direct route-info URLs and browser history without losing stop context", async () => {
    await render("/nearby/simple-routes/54?stop=102&direction=1&route=54");
    expect(container.querySelector('[aria-label="Route 54 details"]')).not.toBeNull();
    const close = Array.from(container.querySelectorAll("button")).find(button => button.textContent === "Close");
    await act(async () => close.click());
    expect(container.querySelector<HTMLSelectElement>("#route-origin").value).toBe("102");
    await act(async () => container.querySelector<HTMLAnchorElement>('[aria-label="View Route 54 details"]').click());
    const historyBack = Array.from(container.querySelectorAll("button")).find(button => button.textContent === "History back");
    const historyForward = Array.from(container.querySelectorAll("button")).find(button => button.textContent === "History forward");
    await act(async () => historyBack.click());
    expect(container.querySelector('[aria-label="Route 54 details"]')).toBeNull();
    await act(async () => historyForward.click());
    expect(container.querySelector('[aria-label="Route 54 details"]')).not.toBeNull();
    expect(container.querySelector("output").textContent).toContain("stop=102");
  });

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
