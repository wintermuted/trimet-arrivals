import { ThemeProvider } from "@wintermuted/ui-theme/react";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import {
  getStopCatalog,
  StopCatalog,
} from "../../api/trimet/stopCatalog";
import {
  planTrip,
  TripPlannerResponse,
} from "../../api/trimet/tripplanner";
import TripPlannerView from "./TripPlannerView";

jest.mock("../../api/trimet/stopCatalog", () => {
  const actual = jest.requireActual("../../api/trimet/stopCatalog");
  return { ...actual, getStopCatalog: jest.fn() };
});

jest.mock("../../api/trimet/tripplanner", () => ({
  planTrip: jest.fn(),
}));

const loadCatalog = jest.mocked(getStopCatalog);
const requestTrip = jest.mocked(planTrip);

function catalog(): StopCatalog {
  return {
    stops: [
      {
        aliases: [],
        desc: "Pioneer Courthouse/SW 6th Ave MAX Stn",
        dir: "N",
        lat: 45.518967,
        lng: -122.67856,
        locid: 7777,
        seq: 1,
        tp: false,
      },
      {
        aliases: [],
        desc: "Gresham City Hall MAX Station",
        dir: "E",
        lat: 45.50569,
        lng: -122.43583,
        locid: 8356,
        seq: 1,
        tp: false,
      },
    ],
    routeCount: 2,
    directionCount: 4,
    stopReferenceCount: 3,
    incompleteRouteCount: 0,
    incompleteDirectionCount: 0,
    incompleteRouteNames: [],
    invalidStopCount: 0,
  };
}

function itineraryResponse(
  overrides: Partial<TripPlannerResponse> = {},
): TripPlannerResponse {
  return {
    success: true,
    from: { description: "Gresham City Hall MAX Station", stopId: 8356 },
    to: { description: "Pioneer Courthouse/SW 6th Ave MAX Stn", stopId: 7777 },
    partial: false,
    itineraries: [
      {
        id: "1",
        startTime: "1:39 PM",
        endTime: "2:28 PM",
        duration: 51,
        numberOfTransfers: 1,
        walkingTime: 2,
        distance: 13.94,
        fare: 2.8,
        partial: false,
        legs: [
          {
            id: "1.1",
            mode: "Walk",
            from: { description: "Gresham City Hall MAX Station" },
            to: {
              description: "Gresham Central Transit Center",
              stopId: 8345,
            },
            duration: 2,
            distance: 0.06,
            partial: false,
          },
          {
            id: "1.2",
            mode: "Light Rail",
            from: {
              description: "Gresham Central Transit Center",
              stopId: 8345,
            },
            to: { description: "Union Station", stopId: 8230 },
            route: {
              number: "MAX",
              name: "MAX Blue Line to Portland",
            },
            startTime: "1:39 PM",
            endTime: "2:20 PM",
            partial: false,
          },
          {
            id: "1.3",
            mode: "Commuter Rail",
            from: { description: "Union Station", stopId: 8230 },
            to: { description: "Pioneer Courthouse", stopId: 7777 },
            route: { number: "WES", name: "WES to Beaverton" },
            startTime: "2:30 PM",
            endTime: "2:48 PM",
            partial: false,
          },
        ],
      },
      {
        id: "2",
        startTime: "1:50 PM",
        endTime: "2:45 PM",
        duration: 55,
        numberOfTransfers: 0,
        partial: false,
        legs: [
          {
            id: "2.1",
            mode: "Bus",
            from: { description: "Gresham City Hall" },
            to: { description: "Pioneer Courthouse" },
            route: { number: "20", name: "Burnside/Stark" },
            partial: false,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("TripPlannerView", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    loadCatalog.mockReset().mockResolvedValue(catalog());
    requestTrip.mockReset().mockResolvedValue(itineraryResponse());
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    act(() => root.unmount());
    container.remove();
  });

  async function render(path: string, inSidebar = false) {
    await act(async () => {
      root.render(
        <ThemeProvider>
          <MemoryRouter initialEntries={[path]}>
            <TripPlannerView inSidebar={inSidebar} />
          </MemoryRouter>
        </ThemeProvider>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it("reopens a persisted stop pair in the sidebar and requests fresh itineraries", async () => {
    await render("/planner?from=8356&to=7777");
    act(() => root.unmount());
    root = createRoot(container);
    requestTrip.mockClear();
    await render("/nearby/planner", true);
    expect(requestTrip).not.toHaveBeenCalled();
    const recent = container.querySelector<HTMLInputElement>("#planner-recent");
    expect(container.querySelector('label[for="planner-recent"]').textContent).toBe("Recent trips");
    act(() => recent.focus());
    act(() => Simulate.keyDown(recent, { key: "ArrowDown" }));
    expect(document.getElementById(recent.getAttribute("aria-controls")).querySelectorAll('[role="option"]')).toHaveLength(1);
    await act(async () => Simulate.keyDown(recent, { key: "Enter" }));
    expect(requestTrip).toHaveBeenCalledWith(
      expect.objectContaining({ fromPlace: "8356", toPlace: "7777" }),
    );
    const fields = container.querySelectorAll(".transit-planner-stop-select");
    expect(fields[0].textContent).toContain("8356");
    expect(fields[1].textContent).toContain("7777");
    expect(recent.getAttribute("aria-expanded")).toBe("false");
  });

  it.each(["malformed", "blocked"])("keeps sidebar planning usable when recent storage is %s", async (failure) => {
    if (failure === "malformed") {
      localStorage.setItem("trimet-arrivals:recent-journeys", "{invalid");
    } else {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("Storage blocked", "SecurityError");
      });
    }
    await render("/nearby/planner?from=8356&to=7777", true);
    expect(container.textContent).toContain("Recent trips are unavailable on this device.");
    expect(container.textContent).toContain("Choose a trip");
    expect(container.querySelector(".transit-planner-recent")).toBeNull();
    if (failure === "malformed") {
      expect(localStorage.getItem("trimet-arrivals:recent-journeys")).toBe("{invalid");
    }
  });

  it("plans a name-based deep link with stop IDs and shows transfers and leg detail", async () => {
    await render(
      "/planner?from=Gresham%20City%20Hall%20MAX%20Station&to=Pioneer%20Courthouse%2FSW%206th%20Ave%20MAX%20Stn",
    );

    expect(requestTrip).toHaveBeenCalledWith(
      expect.objectContaining({ fromPlace: "8356", toPlace: "7777" }),
    );
    expect(container.textContent).toContain("Choose a trip");
    expect(container.textContent).toContain("MAX Blue Line to Portland");
    expect(container.textContent).toContain("WES to Beaverton");
    expect(container.textContent).toContain("Transfer");
    expect(container.textContent).toContain("Gresham Central Transit Center");
    expect(container.textContent).toContain("2.80 regular fare");
    const legs = Array.from(container.querySelectorAll(".transit-planner-leg"));
    expect(legs.map(leg => leg.querySelector('svg[aria-hidden="true"]').getAttribute("data-icon")))
      .toEqual(["person-walking", "train-tram", "train"]);
    await act(async () => container.querySelectorAll<HTMLInputElement>('input[name="planner-itinerary"]')[1].click());
    const bus = container.querySelector(".transit-planner-leg");
    expect(bus.querySelector("strong").textContent).toContain("Bus");
    expect(bus.querySelector('svg[aria-hidden="true"]').getAttribute("data-icon")).toBe("bus");
  });

  it("keeps directions collapsed when the selected itinerary changes", async () => {
    await render("/planner?from=8356&to=7777");

    const toggle = container.querySelector<HTMLButtonElement>("h3 button[aria-expanded]");
    const directions = document.getElementById(toggle.getAttribute("aria-controls"));
    expect(toggle.textContent.trim()).toBe("Directions");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(directions.hidden).toBe(false);
    expect(directions.querySelectorAll("ol > li.transit-planner-leg")).toHaveLength(3);

    act(() => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(directions.hidden).toBe(true);

    const secondTrip = container.querySelectorAll<HTMLInputElement>('input[name="planner-itinerary"]')[1];
    await act(async () => secondTrip.click());
    expect(secondTrip.checked).toBe(true);
    expect(directions.hidden).toBe(true);

    act(() => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(directions.hidden).toBe(false);
    expect(directions.querySelector('ol[aria-label="Itinerary 2 steps"]').textContent).toContain("Burnside/Stark");
  });

  it("rejects identical stop IDs without making a planner request", async () => {
    await render("/planner?from=7777&to=7777");

    expect(container.querySelector('[role="alert"]').textContent).toContain(
      "different stops",
    );
    expect(requestTrip).not.toHaveBeenCalled();
  });

  it("reports no trips and keeps planner search usable for an invalid linked stop", async () => {
    requestTrip.mockResolvedValueOnce(
      itineraryResponse({ itineraries: [] }),
    );
    await render("/planner?from=7777&to=8356");

    expect(container.textContent).toContain("No trips were found");

    act(() => root.unmount());
    root = createRoot(container);
    await render("/planner?from=999999&to=8356");
    expect(container.textContent).toContain(
      "The linked stop “999999” was not found",
    );
    expect(requestTrip).toHaveBeenCalledTimes(1);
  });

  it("shows partial response details and retries planner errors", async () => {
    requestTrip
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(
        itineraryResponse({
          partial: true,
          itineraries: [
            {
              ...itineraryResponse().itineraries[0],
              partial: true,
            },
          ],
        }),
      );
    await render("/planner?from=7777&to=8356");

    expect(container.querySelector('[role="alert"]').textContent).toContain(
      "Could not load trip options",
    );
    const retry = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Retry trip search",
    );
    await act(async () => {
      retry.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(requestTrip).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("incomplete itinerary details");
    expect(container.textContent).toContain("Available leg information");
  });

  it("groups both fields by published street prefixes and keeps other stops searchable", async () => {
    const data = catalog();
    data.stops.push({ ...data.stops[0], locid: 299, desc: "NE 42nd & Broadway" });
    data.stops.push({ ...data.stops[0], locid: 399, desc: "Broadway & SW 6th" });
    loadCatalog.mockResolvedValue(data);
    await render("/planner");

    for (const id of ["planner-from", "planner-to"]) {
      const input = container.querySelector<HTMLInputElement>(`#${id}`);
      act(() => input.focus());
      act(() => Simulate.keyDown(input, { key: "ArrowDown" }));
      const menu = document.getElementById(input.getAttribute("aria-controls"));
      expect(menu.textContent).toContain("NE");
      expect(menu.textContent).toContain("SW");
      expect(menu.textContent).toContain("Other stops");
      act(() => Simulate.keyDown(input, { key: "Escape" }));
    }

    const from = container.querySelector<HTMLInputElement>("#planner-from");
    act(() => from.focus());
    act(() => {
      from.value = "8356";
      Simulate.change(from);
    });
    expect(document.querySelector('[role="option"]').textContent).toContain("8356");
    act(() => Simulate.keyDown(from, { key: "ArrowDown" }));
    act(() => Simulate.keyDown(from, { key: "Enter" }));
    expect(from.closest(".transit-planner-stop-select").textContent).toContain("8356");
  });
});
