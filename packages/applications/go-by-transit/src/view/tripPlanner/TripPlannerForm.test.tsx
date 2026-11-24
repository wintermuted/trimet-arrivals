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

vi.mock("../../api/trimet/stopCatalog", async () => {
  const actual = (await vi.importActual<typeof import("../../api/trimet/stopCatalog")>("../../api/trimet/stopCatalog"));
  return { ...actual, getStopCatalog: vi.fn() };
});

vi.mock("../../api/trimet/tripplanner", async () => ({
  ...(await vi.importActual<typeof import("../../api/trimet/tripplanner")>("../../api/trimet/tripplanner")),
  planTrip: vi.fn(),
}));
vi.mock("../../api/geolocation/geoLocateCurrentPosition");

describe("TripPlannerView: endpoint editing and geolocation", () => {
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

  it("rejects identical stop IDs without making a planner request", async () => {
    await render("/planner?from=7777&to=7777");

    expect(container.querySelector('[role="alert"]').textContent).toContain(
      "different stops",
    );
    expect(requestTrip).not.toHaveBeenCalled();
  });

  it("rejects malformed coordinates, then preserves the correct order in the link and request", async () => {
    await render("/planner?from=8356&toCoord=45,-122");
    expect(container.textContent).toContain("The linked location is invalid.");
    expect(requestTrip).not.toHaveBeenCalled();
    const input = container.querySelector<HTMLInputElement>("#planner-to");
    act(() => {
      fireEvent.change(input, { target: { value: "-122.6815, 45.5231" } });
    });
    await act(async () => { fireEvent.submit(container.querySelector("form")); });
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
    vi.mocked(geoLocateCurrentPosition).mockRejectedValueOnce(new Error("denied"))
      .mockResolvedValueOnce({ coords: { longitude: -122.43582, latitude: 45.50568 } });
    await render("/planner?to=7777", true);
    const nearest = container.querySelector<HTMLButtonElement>('[aria-label="Use nearest stop to me for boarding"]');
    expect(nearest.closest(".transit-planner-endpoint-row").querySelector("#planner-from")).not.toBeNull();
    expect(geoLocateCurrentPosition).not.toHaveBeenCalled();
    await act(async () => nearest.click());
    expect(container.textContent).toContain("Check browser permissions");
    await act(async () => nearest.click());
    expect(document.activeElement).toBe(container.querySelector("#planner-from"));
    await act(async () => { fireEvent.submit(container.querySelector("form")); });
    expect(requestTrip).toHaveBeenCalledWith({ fromPlace: "8356", toPlace: "7777", signal: expect.anything() });
    const query = container.querySelector('[data-test-id="query"]').textContent;
    expect(query).toBe("?from=8356&to=7777");
    expect(localStorage.getItem("overworld:recent-journeys")).not.toContain("-122.43582");
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
    await act(async () => { fireEvent.submit(container.querySelector("form")); });
    expect(requestTrip).toHaveBeenLastCalledWith(expect.objectContaining({
      fromCoord: "-122.6815,45.5231", toPlace: "8356",
    }));
  });

  it("swaps a single chosen stop and ignores a pending nearest-stop result", async () => {
    let finishLocation: (position: Awaited<ReturnType<typeof geoLocateCurrentPosition>>) => void;
    vi.mocked(geoLocateCurrentPosition).mockImplementationOnce(() => new Promise(resolve => {
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


});
