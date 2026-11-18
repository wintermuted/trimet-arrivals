import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes, Link } from "react-router-dom";
import { createStore } from "redux";
import { readRecentJourneys } from "../../api/localstorage/recentJourneys";
import { getSystemAlerts } from "../../api/trimet/alerts";
import { getStopCatalog, StopCatalog } from "../../api/trimet/stopCatalog";
import { planTrip } from "../../api/trimet/tripplanner";
import reducers from "../../store/reducers";
import TripPlannerView from "../tripPlanner/TripPlannerView";
import SearchHome from "./SearchHome";

jest.mock("../nearby/util/mapbox/initializeMap", () => ({
  initializeMap: jest.fn(() => {
    throw new Error("No WebGL");
  }),
}));
jest.mock("../../api/trimet/alerts");
jest.mock("../../api/trimet/tripplanner");
jest.mock("../../api/trimet/stopCatalog", () => ({
  ...jest.requireActual("../../api/trimet/stopCatalog"),
  getStopCatalog: jest.fn(),
}));

const loadCatalog = jest.mocked(getStopCatalog);
const stop = {
  aliases: [],
  dir: "E",
  lat: 45.5,
  lng: -122.5,
  seq: 1,
  tp: false,
};
const catalog: StopCatalog = {
  stops: [
    { ...stop, desc: "Central Station", locid: 8200 },
    { ...stop, desc: "Central Station", locid: 200 },
    { ...stop, desc: "Boarding Station", locid: 350 },
  ],
  routeCount: 1,
  directionCount: 1,
  stopReferenceCount: 3,
  incompleteRouteCount: 0,
  incompleteDirectionCount: 0,
  incompleteRouteNames: [],
  invalidStopCount: 0,
};

describe("Search homepage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    loadCatalog.mockReset().mockResolvedValue(catalog);
    jest
      .mocked(getSystemAlerts)
      .mockResolvedValue({ alert: [], queryTime: "" });
    jest
      .mocked(planTrip)
      .mockReset()
      .mockResolvedValue({
        success: true,
        partial: false,
        itineraries: [{ legs: [], duration: 12, partial: false }],
      });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
  });

  async function render(store = createStore(reducers)) {
    await act(async () =>
      root.render(
        <Provider store={store}>
          <MemoryRouter>
            <Routes>
              <Route path="/" element={<SearchHome />} />
              <Route
                path="/planner"
                element={
                  <>
                    <TripPlannerView />
                    <Link to="/">Return home</Link>
                  </>
                }
              />
            </Routes>
          </MemoryRouter>
        </Provider>,
      ),
    );
  }

  function type(selector: string, value: string) {
    const input = container.querySelector<HTMLInputElement>(selector);
    input.value = value;
    act(() => Simulate.change(input));
  }

  function click(selector: string) {
    return act(async () =>
      container.querySelector<HTMLElement>(selector).click(),
    );
  }

  it("uses the chosen platform ID in the real planner and shows the completed journey on return", async () => {
    await render();
    expect(container.textContent).toContain(
      "Trips you find in the planner appear here",
    );
    expect(container.textContent).toContain("No bookmarks yet");
    expect(container.querySelector('a[href="/nearby/stops"]')).not.toBeNull();
    expect(container.textContent).toContain("No system alerts right now");
    type("#homepage-stop", "200");
    expect(
      container
        .querySelector('[aria-label="Matching stops"] a')
        .getAttribute("href"),
    ).toBe("/planner?to=200");
    expect(container.querySelector('a[href="/nearby/stops/8200?referrer=%2F"]')).not.toBeNull();
    type("#homepage-stop", "Central Station");
    expect(
      container.querySelectorAll('[aria-label="Matching stops"] li'),
    ).toHaveLength(2);
    await click('a[href="/planner?to=200"]');
    type("#planner-from", "350");
    await click("#planner-from-matches button");
    await act(async () => Simulate.submit(container.querySelector("form")));
    expect(planTrip).toHaveBeenCalledWith(
      expect.objectContaining({ fromPlace: "350", toPlace: "200" }),
    );
    expect(container.textContent).toContain("12 min");
    await click('a[href="/"]');
    expect(
      container.querySelector('a[href="/planner?from=350&to=200"]').textContent,
    ).toContain("Boarding Station (350) to Central Station (200)");
  });

  it("keeps typed queries on catalog failure, retries, and distinguishes no matches", async () => {
    let rejectLoad: (error: Error) => void;
    loadCatalog.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectLoad = reject;
        }),
    );
    await render();
    type("#homepage-stop", "Does not exist");
    expect(container.textContent).toContain("Loading TriMet stops");
    expect(container.textContent).not.toContain("No stops match");
    await act(async () => rejectLoad(new Error("offline")));
    expect(container.textContent).toContain("Could not load TriMet stops");
    await click(".transit-search-primary button");
    expect(loadCatalog).toHaveBeenLastCalledWith(true);
    expect(container.textContent).toContain("No stops match");
  });

  it("keeps existing bookmarks and search available when the optional map fails", async () => {
    const store = createStore(reducers, {
      ...reducers(undefined, { type: "test:init" }),
      bookmarksReducer: {
        bookmarks: { 200: { ...stop, id: 200, desc: "My stop" } },
      },
      routeBookmarksReducer: {
        ...reducers(undefined, { type: "test:init" }).routeBookmarksReducer,
        bookmarks: { 54: { route: 54, desc: "My route", type: "B" } },
      },
    });
    await render(store);
    expect(
      container.querySelector('a[href="/stop/200"]').textContent,
    ).toContain("My stop");
    expect(
      container.querySelector('a[href="/lines/54"]').textContent,
    ).toContain("My route");
    expect(container.querySelector(".transit-search-map")).toBeNull();
    await click("button[aria-expanded=false]");
    expect(container.textContent).toContain("The map preview is unavailable");
    type("#homepage-stop", "Boarding");
    expect(container.querySelector('a[href="/planner?to=350"]')).not.toBeNull();
    expect(readRecentJourneys()).toEqual([]);
  });
});
