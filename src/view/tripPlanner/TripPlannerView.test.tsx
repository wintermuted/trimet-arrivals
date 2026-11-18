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

  async function render(path: string, inSidebar = false) {
    function SearchLocation() {
      return <output data-test-id="query">{useLocation().search}</output>;
    }
    await act(async () => {
      root.render(
        <ThemeProvider>
          <MemoryRouter initialEntries={[path]}>
            <SearchLocation />
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
    const stops = container.querySelectorAll(".transit-planner-stop-summary dd");
    expect(stops[0].textContent).toContain("8356");
    expect(stops[1].textContent).toContain("7777");
    expect(document.activeElement).toBe(container.querySelector("#transit-planner-title + .transit-planner-edit"));
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
    const click = (text: string) => Array.from(container.querySelectorAll("button"))
      .find(button => button.textContent.trim() === text).click();
    act(() => click("Other origin options"));
    expect(document.activeElement).toBe(container.querySelector("#planner-from"));
    expect(geoLocateCurrentPosition).not.toHaveBeenCalled();
    await act(async () => click("Use nearest stop to me"));
    expect(container.textContent).toContain("Check browser permissions");
    await act(async () => click("Use nearest stop to me"));
    expect(document.activeElement).toBe(container.querySelector("#planner-from"));
    await act(async () => Simulate.submit(container.querySelector("form")));
    expect(requestTrip).toHaveBeenCalledWith({ fromPlace: "8356", toPlace: "7777", signal: expect.anything() });
    const query = container.querySelector('[data-test-id="query"]').textContent;
    expect(query).toBe("?from=8356&to=7777");
    expect(localStorage.getItem("trimet-arrivals:recent-journeys")).not.toContain("-122.43582");
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
