import { ThemeProvider } from "@wintermuted/ui-theme/react";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { MemoryRouter, useLocation } from "react-router-dom";
import geoLocateCurrentPosition from "../../api/geolocation/geoLocateCurrentPosition";
import {
  getStopCatalog,
  StopCatalog,
} from "../../api/trimet/stopCatalog";
import {
  planTrip,
  TripPlannerResponse,
} from "../../api/trimet/tripplanner";
import TripPlannerView from "./TripPlannerView";
import type { SavedPlannerStop } from "./PlannerStopSelect";
import * as placesApi from "../../api/places/places";

jest.mock("../../api/trimet/stopCatalog", () => {
  const actual = jest.requireActual("../../api/trimet/stopCatalog");
  return { ...actual, getStopCatalog: jest.fn() };
});

jest.mock("../../api/trimet/tripplanner", () => ({
  ...jest.requireActual("../../api/trimet/tripplanner"),
  planTrip: jest.fn(),
}));
jest.mock("../../api/geolocation/geoLocateCurrentPosition");

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
    jest.mocked(geoLocateCurrentPosition).mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    act(() => root.unmount());
    container.remove();
  });

  async function render(path: string, inSidebar = false, savedStops?: SavedPlannerStop[]) {
    function SearchLocation() {
      return <output data-test-id="query">{useLocation().search}</output>;
    }
    await act(async () => {
      root.render(
        <ThemeProvider>
          <MemoryRouter initialEntries={[path]}>
            <SearchLocation />
            <TripPlannerView inSidebar={inSidebar} savedStops={savedStops} />
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
    const stops = container.querySelectorAll(".transit-planner-stop-summary dd");
    expect(stops[0].textContent).toContain("8356");
    expect(stops[1].textContent).toContain("7777");
    expect(document.activeElement).toBe(container.querySelector("#transit-planner-title + .transit-planner-edit"));
  });

  it("requires confirmation for an approximate named destination and retains its identity through planning and swapping", async () => {
    const place: placesApi.InterestPlace = {
      id: "portland:park:101", name: "Example Park", category: "park",
      coordinates: [-122.6815, 45.5231], arrival: "approximate", sourceUrl: "https://www.portlandmaps.com/"
    };
    jest.spyOn(placesApi, "usePlaceCatalog").mockReturnValue({
      places: [place], sources: placesApi.emptyPlaceSources(), retry: jest.fn()
    });
    await render("/nearby/planner?from=8356&toCoord=-122.6815,45.5231&toPlaceId=portland:park:101&confirmPlace=1", true);
    expect(requestTrip).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Example Park");
    expect(container.textContent).toContain("Confirm the approximate arrival point");
    await act(async () => Simulate.submit(container.querySelector("form")));
    expect(requestTrip).toHaveBeenCalledWith(expect.objectContaining({ fromPlace: "8356", toCoord: "-122.6815,45.5231" }));
    expect(container.querySelector('[data-test-id="query"]').textContent).toContain("toPlaceId=portland%3Apark%3A101");
    expect(container.querySelector(".transit-planner-stop-summary").textContent).toContain("Example Park");
    act(() => container.querySelector<HTMLButtonElement>("#transit-planner-title + .transit-planner-edit").click());
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Swap origin and destination"]').click());
    await act(async () => Simulate.submit(container.querySelector("form")));
    expect(requestTrip).toHaveBeenLastCalledWith(expect.objectContaining({ fromCoord: "-122.6815,45.5231", toPlace: "8356" }));
    expect(container.querySelector('[data-test-id="query"]').textContent).toContain("fromPlaceId=portland%3Apark%3A101");
  });

  it.each<[placesApi.PlaceCategory, string, string]>([
    ["library", "metro:library:central-library", "Central Library"],
    ["community-center", "metro:community-center:13", "Community Center"],
    ["community-garden", "portland:garden:37d4ec75-92b5-47dd-8b36-b8717e7a2cc5", "Community Garden"],
    ["farmers-market", "portland:market:1", "Farmers Market"]
  ])("leaves origin empty for a linked %s and clears stale identity when editing coordinates", async (category, id, name) => {
    const place: placesApi.InterestPlace = {
      id, name, category,
      coordinates: [-122.6815, 45.5231], arrival: "approximate", sourceUrl: "https://www.portlandmaps.com/"
    };
    jest.spyOn(placesApi, "usePlaceCatalog").mockReturnValue({
      places: [place], sources: placesApi.emptyPlaceSources(), retry: jest.fn()
    });
    await render(`/nearby/planner?toCoord=-122.6815,45.5231&toPlaceId=${id}&confirmPlace=1`, true);
    expect(container.textContent).toContain(name);
    expect(requestTrip).not.toHaveBeenCalled();
    expect(geoLocateCurrentPosition).not.toHaveBeenCalled();
    const input = container.querySelector<HTMLInputElement>("#planner-to");
    act(() => Simulate.change(input, { target: { value: "-122.68,45.52" } } as never));
    expect(container.textContent).not.toContain(name);
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Swap origin and destination"]').click());
    expect(container.querySelector<HTMLInputElement>("#planner-from").value).toBe("-122.68,45.52");
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
    act(() => container.querySelector<HTMLButtonElement>("#transit-planner-title + .transit-planner-edit").click());
    expect(container.textContent).toContain("Recent trips are unavailable on this device.");
    expect(container.textContent).toContain("Choose a trip");
    expect(container.querySelector(".transit-planner-recent")).toBeNull();
    if (failure === "malformed") {
      expect(localStorage.getItem("trimet-arrivals:recent-journeys")).toBe("{invalid");
    }
  });

  it("compares options by schedule, duration, and their actual legs in travel order", async () => {
    loadCatalog.mockResolvedValue({
      ...catalog(),
      plannerRouteColors: new Map([[100, "#0069aa"]]),
    });
    const [transit, bus] = itineraryResponse().itineraries;
    transit.legs[1].route.internalNumber = 100;
    requestTrip.mockResolvedValue(itineraryResponse({
      itineraries: [
        transit,
        bus,
        { id: "3", endTime: "2:50 PM", legs: [transit.legs[0]], partial: true },
        { id: "4", legs: [], partial: true },
      ],
    }));
    await render("/nearby/planner?from=8356&to=7777", true);

    const [mixed, direct, walk, partial] = container.querySelectorAll<HTMLButtonElement>(".transit-planner-options button");
    const labels = (option: HTMLButtonElement) =>
      Array.from(option.querySelectorAll(".transit-planner-option-leg span"), label => label.textContent);
    expect(mixed.querySelector("strong").textContent).toBe("1:39 PM to 2:28 PM");
    expect(mixed.textContent).toContain("51 min");
    expect(labels(mixed)).toEqual(["Walk", "MAX Blue Line", "WES to Beaverton"]);
    expect(mixed.querySelector<SVGElement>('[data-icon="train-tram"]').style.color).toBe("rgb(0, 105, 170)");
    expect(labels(direct)).toEqual(["Bus 20"]);
    expect(labels(walk)).toEqual(["Walk"]);
    expect(walk.querySelector(".transit-planner-option-chevron")).toBeNull();
    expect(walk.textContent).toContain("Arrives 2:50 PM");
    expect(walk.textContent).toContain("Duration unavailable");
    expect(walk.textContent).not.toContain("transfer");
    expect(partial.textContent).toContain("Times unavailable");
    expect(partial.textContent).toContain("Route details unavailable");
  });

  it("plans a name-based deep link with stop IDs and shows transfers and leg detail", async () => {
    await render(
      "/planner?from=Gresham%20City%20Hall%20MAX%20Station&to=Pioneer%20Courthouse%2FSW%206th%20Ave%20MAX%20Stn",
    );

    expect(requestTrip).toHaveBeenCalledWith(
      expect.objectContaining({ fromPlace: "8356", toPlace: "7777" }),
    );
    expect(container.textContent).toContain("Choose a trip");
    const options = () => container.querySelectorAll<HTMLButtonElement>(".transit-planner-options button");
    await act(async () => options()[0].click());
    expect(container.textContent).toContain("MAX Blue Line to Portland");
    expect(container.textContent).toContain("WES to Beaverton");
    expect(container.textContent).toContain("Transfer");
    expect(container.textContent).toContain("Gresham Central Transit Center");
    expect(container.textContent).toContain("2.80 regular fare");
    const legs = Array.from(container.querySelectorAll(".transit-planner-leg"));
    expect(legs.map(leg => leg.querySelector('svg[aria-hidden="true"]').getAttribute("data-icon")))
      .toEqual(["person-walking", "train-tram", "train"]);
    act(() => container.querySelector<HTMLButtonElement>(".transit-planner-results .transit-planner-edit").click());
    await act(async () => options()[1].click());
    const bus = container.querySelector(".transit-planner-leg");
    expect(bus.querySelector("strong").textContent).toContain("Bus");
    expect(bus.querySelector('svg[aria-hidden="true"]').getAttribute("data-icon")).toBe("bus");
  });

  it("keeps directions collapsed when the selected itinerary changes", async () => {
    await render("/planner?from=8356&to=7777");
    await act(async () => container.querySelector<HTMLButtonElement>(".transit-planner-options button").click());

    const toggle = container.querySelector<HTMLButtonElement>(".transit-planner-itinerary-detail h3 button");
    const directions = document.getElementById(toggle.getAttribute("aria-controls"));
    expect(toggle.textContent.trim()).toBe("Directions");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(directions.hidden).toBe(false);
    expect(directions.querySelectorAll("ol > li.transit-planner-leg")).toHaveLength(3);

    act(() => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(directions.hidden).toBe(true);

    act(() => container.querySelector<HTMLButtonElement>(".transit-planner-results .transit-planner-edit").click());
    const secondTrip = container.querySelectorAll<HTMLButtonElement>(".transit-planner-options button")[1];
    await act(async () => secondTrip.click());
    expect(directions.hidden).toBe(true);

    act(() => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(directions.hidden).toBe(false);
    expect(directions.querySelector('ol[aria-label="Itinerary 2 steps"]').textContent).toContain("Burnside/Stark");
  });

  it("starts unselected and preserves the current trip while editing or canceling", async () => {
    await render("/planner?from=8356&to=7777");

    const options = () => container.querySelectorAll<HTMLButtonElement>(".transit-planner-options button");
    const edit = () => container.querySelector<HTMLButtonElement>(".transit-planner-results .transit-planner-edit");
    const toggle = Array.from(container.querySelectorAll<HTMLButtonElement>("h3 button"))
      .find(button => button.textContent.trim() === "Choose a trip");
    const panel = document.getElementById(toggle.getAttribute("aria-controls"));
    expect(panel.contains(options()[1])).toBe(true);
    expect(panel.hidden).toBe(false);
    expect(panel.querySelector("[aria-current]")).toBeNull();
    expect(container.querySelector(".transit-planner-itinerary-detail")).toBeNull();
    await act(async () => options()[1].click());
    expect(panel.querySelector(".transit-planner-summary").textContent).toContain("55 min");
    expect(toggle.closest("header")).toBe(edit().closest("header"));
    expect(edit().getAttribute("aria-label")).toBe("Edit trip");
    expect(document.activeElement).toBe(edit());
    act(() => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(panel.hidden).toBe(true);
    expect(container.querySelector('ol[aria-label="Itinerary 2 steps"]')).not.toBeNull();

    act(() => edit().click());
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(panel.hidden).toBe(false);
    expect(options()[1].getAttribute("aria-current")).toBe("true");
    expect(document.activeElement).toBe(options()[1]);
    expect(container.querySelector('ol[aria-label="Itinerary 2 steps"]')).not.toBeNull();
    act(() => Array.from(panel.querySelectorAll<HTMLButtonElement>("button"))
      .find(button => button.textContent.trim() === "Cancel").click());
    expect(document.activeElement).toBe(edit());
  });

  it("keeps the form selections and results when the form is collapsed", async () => {
    await render("/nearby/planner?from=8356&to=7777", true);

    const toggle = container.querySelector<HTMLButtonElement>("#transit-planner-title button");
    const panel = document.getElementById(toggle.getAttribute("aria-controls"));
    const edit = container.querySelector<HTMLButtonElement>("#transit-planner-title + .transit-planner-edit");
    expect(toggle.closest("header")).toBe(edit.closest("header"));
    expect(edit.getAttribute("aria-label")).toBe("Edit stops");
    act(() => toggle.click());
    expect(panel.hidden).toBe(true);
    act(() => edit.click());
    expect(document.activeElement).toBe(panel.querySelector("#planner-from"));
    const form = panel.querySelector("form");
    const initialText = form.textContent;
    expect(panel.hidden).toBe(false);
    expect(form.querySelector("button[type=submit]").hasAttribute("disabled")).toBe(false);

    act(() => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(panel.hidden).toBe(true);
    expect(container.querySelector(".transit-planner-results").closest("[hidden]")).toBeNull();

    act(() => toggle.click());
    expect(panel.hidden).toBe(false);
    expect(panel.querySelector("form").textContent).toBe(initialText);
    expect(requestTrip).toHaveBeenCalledTimes(1);
  });

  it("keeps the last successful stop pair and selected trip until an edited search returns trips", async () => {
    const stops = catalog();
    stops.stops.push({ ...stops.stops[0], locid: 299, desc: "NE 42nd & Broadway" });
    loadCatalog.mockResolvedValue(stops);
    let finishSearch: (response: TripPlannerResponse) => void;
    requestTrip
      .mockResolvedValueOnce(itineraryResponse())
      .mockImplementationOnce(() => new Promise(resolve => { finishSearch = resolve; }))
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(itineraryResponse());
    await render("/nearby/planner?from=8356&to=7777", true);
    const form = () => container.querySelector<HTMLFormElement>("form.transit-planner-form");
    const details = () => container.querySelector('ol[aria-label="Itinerary 2 steps"]');
    const submit = () => act(async () => Simulate.submit(form()));
    act(() => container.querySelectorAll<HTMLButtonElement>(".transit-planner-options button")[1].click());
    act(() => container.querySelector<HTMLButtonElement>("#transit-planner-title + .transit-planner-edit").click());
    const destination = container.querySelector<HTMLInputElement>("#planner-to");
    act(() => {
      destination.focus();
      destination.value = "299";
      Simulate.change(destination);
    });
    act(() => Simulate.keyDown(destination, { key: "ArrowDown" }));
    act(() => Simulate.keyDown(destination, { key: "Enter" }));
    await submit();
    expect(requestTrip).toHaveBeenLastCalledWith(expect.objectContaining({ fromPlace: "8356", toPlace: "299" }));
    expect(container.textContent).toContain("Finding trips");
    expect(details()).not.toBeNull();
    expect(container.textContent).toMatch(/Showing results for .*7777/);
    await act(async () => finishSearch(itineraryResponse({ itineraries: [] })));
    expect(container.textContent).toContain("No trips were found");
    expect(details()).not.toBeNull();
    await submit();
    expect(container.textContent).toContain("Could not load trip options");
    expect(details()).not.toBeNull();
    await submit();
    expect(container.querySelector(".transit-planner-stop-summary").textContent).toContain("NE 42nd & Broadway (299)");
    expect(details()).toBeNull();
    expect(form()).toBeNull();
  });

  it("rejects identical stop IDs without making a planner request", async () => {
    await render("/planner?from=7777&to=7777");

    expect(container.querySelector('[role="alert"]').textContent).toContain(
      "different stops",
    );
    expect(requestTrip).not.toHaveBeenCalled();
  });

  it("plans a linked place-to-stop trip, keeping geographic inputs out of stop history", async () => {
    requestTrip.mockResolvedValueOnce(itineraryResponse({
      from: { description: "Powell's City of Books", lat: 45.523, lon: -122.681 },
    }));
    await render("/planner?fromPlace=Powell%27s+City+of+Books&to=7777", true);
    expect(requestTrip).toHaveBeenCalledWith(expect.objectContaining({
      fromPlace: "Powell's City of Books", toPlace: "7777",
    }));
    expect(container.querySelector(".transit-planner-stop-summary").textContent).toContain("Powell's City of Books");
    expect(container.querySelector('[aria-label="Edit locations"]')).not.toBeNull();
    expect(localStorage.getItem("trimet-arrivals:recent-journeys")).toBeNull();
    expect(geoLocateCurrentPosition).not.toHaveBeenCalled();
  });

  it("rejects malformed coordinates, then preserves the correct order in the link and request", async () => {
    await render("/planner?from=8356&toCoord=45,-122");
    expect(container.textContent).toContain("The linked location is invalid.");
    expect(requestTrip).not.toHaveBeenCalled();
    const input = container.querySelector<HTMLInputElement>("#planner-to");
    act(() => {
      input.value = "-122.6815, 45.5231";
      Simulate.change(input);
    });
    await act(async () => Simulate.submit(container.querySelector("form")));
    expect(requestTrip).toHaveBeenCalledWith(expect.objectContaining({
      fromPlace: "8356", toCoord: "-122.6815,45.5231",
    }));
    const query = container.querySelector('[data-test-id="query"]').textContent;
    expect(new URLSearchParams(query).get("toCoord")).toBe("-122.6815,45.5231");
  });

  it("shows a geocoding failure instead of presenting it as an empty trip list", async () => {
    requestTrip.mockResolvedValueOnce(itineraryResponse({
      success: false, errorMessage: "Uncertain Location: Main Street was not recognized", itineraries: [],
    }));
    await render("/planner?fromPlace=Main+Street&to=7777");
    expect(container.querySelector('[role="alert"]').textContent).toContain("Main Street was not recognized");
    expect(container.querySelector(".transit-planner-results")).toBeNull();
    expect(container.querySelector<HTMLInputElement>("#planner-from").value).toBe("Main Street");
  });

  it("requests device location only on demand and uses only the chosen public stop ID", async () => {
    jest.mocked(geoLocateCurrentPosition).mockRejectedValueOnce(new Error("denied"))
      .mockResolvedValueOnce({ coords: { longitude: -122.43582, latitude: 45.50568 } });
    await render("/planner?to=7777", true);
    const nearest = container.querySelector<HTMLButtonElement>('[aria-label="Use nearest stop to me for boarding"]');
    expect(nearest.closest(".transit-planner-endpoint-row").querySelector("#planner-from")).not.toBeNull();
    expect(geoLocateCurrentPosition).not.toHaveBeenCalled();
    await act(async () => nearest.click());
    expect(container.textContent).toContain("Check browser permissions");
    await act(async () => nearest.click());
    expect(document.activeElement).toBe(container.querySelector("#planner-from"));
    await act(async () => Simulate.submit(container.querySelector("form")));
    expect(requestTrip).toHaveBeenCalledWith({ fromPlace: "8356", toPlace: "7777", signal: expect.anything() });
    const query = container.querySelector('[data-test-id="query"]').textContent;
    expect(query).toBe("?from=8356&to=7777");
    expect(localStorage.getItem("trimet-arrivals:recent-journeys")).not.toContain("-122.43582");
  });

  it("swaps mixed drafts without changing the last results, selection, or URL until submission", async () => {
    await render("/planner?from=8356&toCoord=-122.6815,45.5231", true);
    const expectEndpointMarkers = (surface: string) => {
      const endpoints = container.querySelectorAll(`${surface} .transit-planner-endpoint`);
      expect(endpoints[0].querySelector('.transit-planner-endpoint-marker--from[aria-hidden="true"]')).not.toBeNull();
      expect(endpoints[1].querySelector('.transit-planner-endpoint-marker--to[aria-hidden="true"]')).not.toBeNull();
    };
    expectEndpointMarkers(".transit-planner-stop-summary");
    act(() => container.querySelector<HTMLButtonElement>(".transit-planner-options button").click());
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Edit locations"]').click());
    expectEndpointMarkers(".transit-planner-form");
    const swap = container.querySelector<HTMLButtonElement>('button[aria-label="Swap origin and destination"]');
    expect(swap.textContent.trim()).toBe("");
    const query = container.querySelector('[data-test-id="query"]');
    const originalQuery = query.textContent;
    act(() => swap.click());
    expect(container.querySelector<HTMLInputElement>("#planner-from").value).toBe("-122.6815,45.5231");
    expect(container.querySelector("#planner-to").closest(".transit-planner-stop-select").textContent).toContain("8356");
    expect(query.textContent).toBe(originalQuery);
    expect(requestTrip).toHaveBeenCalledTimes(1);
    expect(container.textContent).toMatch(/Showing results for .*8356.* to -122\.6815,45\.5231/);
    expect(container.querySelector('ol[aria-label="Itinerary 1 steps"]')).not.toBeNull();
    await act(async () => Simulate.submit(container.querySelector("form")));
    expect(requestTrip).toHaveBeenLastCalledWith(expect.objectContaining({
      fromCoord: "-122.6815,45.5231", toPlace: "8356",
    }));
  });

  it("swaps a single chosen stop and ignores a pending nearest-stop result", async () => {
    let finishLocation: (position: Awaited<ReturnType<typeof geoLocateCurrentPosition>>) => void;
    jest.mocked(geoLocateCurrentPosition).mockImplementationOnce(() => new Promise(resolve => {
      finishLocation = resolve;
    }));
    await render("/planner?to=7777", true);
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Use nearest stop to me for boarding"]').click());
    act(() => container.querySelector<HTMLButtonElement>(".transit-planner-swap").click());
    await act(async () => finishLocation({ coords: { longitude: -122.43582, latitude: 45.50568 } }));
    expect(container.querySelector("#planner-from").closest(".transit-planner-stop-select").textContent).toContain("7777");
    expect(container.querySelector("#planner-to").closest(".transit-planner-stop-select").textContent).not.toContain("7777");
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
    expect(container.querySelectorAll(".transit-planner-options button")).toHaveLength(1);
    await act(async () => container.querySelector<HTMLButtonElement>(".transit-planner-options button").click());
    expect(container.textContent).toContain("Available leg information");
  });

  it("suggests verified common places by alias in both stop pickers and plans with the stop ID", async () => {
    const data = catalog();
    data.stops.push({ ...data.stops[0], locid: 9650, desc: "Washington Square Transit Center" });
    loadCatalog.mockResolvedValue(data);
    await render("/planner?from=8356");

    for (const id of ["planner-from", "planner-to"]) {
      const input = container.querySelector<HTMLInputElement>(`#${id}`);
      act(() => {
        input.focus();
        input.value = "Washington  Square Mall";
        Simulate.change(input);
      });

      const menu = document.getElementById(input.getAttribute("aria-controls"));
      expect(menu.textContent).toContain("Common places");
      expect(menu.querySelectorAll('[role="option"]')).toHaveLength(1);
      expect(menu.querySelector('[role="option"]').textContent).toBe("Washington Square Transit Center (9650)");
      if (id === "planner-from") {
        act(() => input.blur());
      } else {
        act(() => Simulate.keyDown(input, { key: "ArrowDown" }));
        act(() => Simulate.keyDown(input, { key: "Enter" }));
      }
    }

    await act(async () => Simulate.submit(container.querySelector("form")));
    expect(requestTrip).toHaveBeenCalledWith(expect.objectContaining({ fromPlace: "8356", toPlace: "9650" }));
  });

  it("suggests an assigned stop by role in both pickers without duplicating catalog entries", async () => {
    await render("/planner", false, [
      { id: 8356, label: "Home stop" },
      { id: 8356, label: "Work stop" },
      { id: 999999, label: "Missing stop" }
    ]);

    for (const id of ["planner-from", "planner-to"]) {
      const input = container.querySelector<HTMLInputElement>(`#${id}`);
      act(() => {
        input.focus();
        input.value = "home";
        Simulate.change(input);
      });
      const menu = document.getElementById(input.getAttribute("aria-controls"));
      expect(menu.textContent).toContain("Saved stops");
      expect(menu.textContent).toContain("Home stop / Work stop:");
      expect(menu.querySelectorAll('[role="option"]')).toHaveLength(1);
      act(() => input.blur());
    }
  });

  it("finds stops by their FX route name and shows the FX badge", async () => {
    const data = catalog();
    data.stops.push({
      ...data.stops[0],
      locid: 9302,
      desc: "NW 5th & Hoyt",
      routes: [{ id: 2, label: "FX2-Division", color: "#61A60E" }],
    });
    loadCatalog.mockResolvedValue(data);
    await render("/planner");
    const input = container.querySelector<HTMLInputElement>("#planner-from");
    act(() => input.focus());
    act(() => {
      input.value = "fx";
      Simulate.change(input);
    });
    const menu = document.getElementById(input.getAttribute("aria-controls"));
    const options = menu.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain("NW 5th & Hoyt (9302)");
    expect(options[0].querySelector(".wm-badge").textContent).toBe("FX2-Division");
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
