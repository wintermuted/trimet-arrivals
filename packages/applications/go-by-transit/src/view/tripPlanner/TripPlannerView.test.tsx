import { vi } from "vitest";
import { ThemeProvider } from "@wintermuted/ui-react";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import geoLocateCurrentPosition from "../../api/geolocation/geoLocateCurrentPosition";
import TripPlannerView from "./TripPlannerView";
import type { SavedPlannerStop } from "./PlannerStopSelect";
import { catalog, itineraryResponse, loadCatalog, requestTrip } from "../../test/tripPlanner/TripPlannerView.fixtures";

import type { TripPlannerResponse } from "../../api/trimet/tripplanner";

vi.mock("../../api/trimet/stopCatalog", async () => {
  const actual = (await vi.importActual<typeof import("../../api/trimet/stopCatalog")>("../../api/trimet/stopCatalog"));
  return { ...actual, getStopCatalog: vi.fn() };
});

vi.mock("../../api/trimet/tripplanner", async () => ({
  ...(await vi.importActual<typeof import("../../api/trimet/tripplanner")>("../../api/trimet/tripplanner")),
  planTrip: vi.fn(),
}));
vi.mock("../../api/geolocation/geoLocateCurrentPosition");

describe("TripPlannerView: itinerary results", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    loadCatalog.mockReset().mockResolvedValue(catalog());
    requestTrip.mockReset().mockResolvedValue(itineraryResponse());
    vi.mocked(geoLocateCurrentPosition).mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    const submit = () => act(async () => { fireEvent.submit(form()); });
    act(() => container.querySelectorAll<HTMLButtonElement>(".transit-planner-options button")[1].click());
    act(() => container.querySelector<HTMLButtonElement>("#transit-planner-title + .transit-planner-edit").click());
    const destination = container.querySelector<HTMLInputElement>("#planner-to");
    act(() => {
      destination.focus();
      fireEvent.change(destination, { target: { value: "299" } });
    });
    act(() => fireEvent.keyDown(destination, { key: "ArrowDown" }));
    act(() => fireEvent.keyDown(destination, { key: "Enter" }));
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


});
