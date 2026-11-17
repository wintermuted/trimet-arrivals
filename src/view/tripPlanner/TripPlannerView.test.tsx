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
    loadCatalog.mockReset().mockResolvedValue(catalog());
    requestTrip.mockReset().mockResolvedValue(itineraryResponse());
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function render(path: string) {
    await act(async () => {
      root.render(
        <ThemeProvider>
          <MemoryRouter initialEntries={[path]}>
            <TripPlannerView />
          </MemoryRouter>
        </ThemeProvider>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });
  }

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

  it("offers keyboard-operable stop search choices for direct input", async () => {
    await render("/planner");

    const from = container.querySelector<HTMLInputElement>("#planner-from");
    act(() => {
      from.value = "Gresham";
      Simulate.change(from);
    });
    const option = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Gresham City Hall"),
    );
    expect(option).toBeDefined();
    expect(option.getAttribute("type")).toBe("button");
    option.focus();
    expect(document.activeElement).toBe(option);
  });
});
