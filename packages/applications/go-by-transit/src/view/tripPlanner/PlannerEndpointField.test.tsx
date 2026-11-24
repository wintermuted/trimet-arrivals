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

describe("TripPlannerView: stop picker suggestions", () => {
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

  it("suggests verified common places by alias in both stop pickers and plans with the stop ID", async () => {
    const data = catalog();
    data.stops.push({ ...data.stops[0], locid: 9650, desc: "Washington Square Transit Center" });
    loadCatalog.mockResolvedValue(data);
    await render("/planner?from=8356");

    for (const id of ["planner-from", "planner-to"]) {
      const input = container.querySelector<HTMLInputElement>(`#${id}`);
      act(() => {
        input.focus();
        fireEvent.change(input, { target: { value: "Washington  Square Mall" } });
      });

      const menu = document.getElementById(input.getAttribute("aria-controls"));
      expect(menu.textContent).toContain("Common places");
      expect(menu.querySelectorAll('[role="option"]')).toHaveLength(1);
      expect(menu.querySelector('[role="option"]').textContent).toBe("Washington Square Transit Center (9650)");
      if (id === "planner-from") {
        act(() => input.blur());
      } else {
        act(() => fireEvent.keyDown(input, { key: "ArrowDown" }));
        act(() => fireEvent.keyDown(input, { key: "Enter" }));
      }
    }

    await act(async () => { fireEvent.submit(container.querySelector("form")); });
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
        fireEvent.change(input, { target: { value: "home" } });
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
      fireEvent.change(input, { target: { value: "fx" } });
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
      act(() => fireEvent.keyDown(input, { key: "ArrowDown" }));
      const menu = document.getElementById(input.getAttribute("aria-controls"));
      expect(menu.textContent).toContain("NE");
      expect(menu.textContent).toContain("SW");
      expect(menu.textContent).toContain("Other stops");
      act(() => fireEvent.keyDown(input, { key: "Escape" }));
    }

    const from = container.querySelector<HTMLInputElement>("#planner-from");
    act(() => from.focus());
    act(() => {
      fireEvent.change(from, { target: { value: "8356" } });
    });
    expect(document.querySelector('[role="option"]').textContent).toContain("8356");
    act(() => fireEvent.keyDown(from, { key: "ArrowDown" }));
    act(() => fireEvent.keyDown(from, { key: "Enter" }));
    expect(from.closest(".transit-planner-stop-select").textContent).toContain("8356");
  });
});
