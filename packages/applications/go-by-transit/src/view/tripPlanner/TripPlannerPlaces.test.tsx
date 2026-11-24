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

import * as placesApi from "@overworld/places/catalog";

vi.mock("../../api/trimet/stopCatalog", async () => {
  const actual = (await vi.importActual<typeof import("../../api/trimet/stopCatalog")>("../../api/trimet/stopCatalog"));
  return { ...actual, getStopCatalog: vi.fn() };
});

vi.mock("../../api/trimet/tripplanner", async () => ({
  ...(await vi.importActual<typeof import("../../api/trimet/tripplanner")>("../../api/trimet/tripplanner")),
  planTrip: vi.fn(),
}));
vi.mock("../../api/geolocation/geoLocateCurrentPosition");

describe("TripPlannerView: named places and recent trips", () => {
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
    act(() => fireEvent.keyDown(recent, { key: "ArrowDown" }));
    expect(document.getElementById(recent.getAttribute("aria-controls")).querySelectorAll('[role="option"]')).toHaveLength(1);
    await act(async () => { fireEvent.keyDown(recent, { key: "Enter" }); });
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
    vi.spyOn(placesApi, "usePlaceCatalog").mockReturnValue({
      places: [place], sources: placesApi.emptyPlaceSources(), retry: vi.fn()
    });
    await render("/nearby/planner?from=8356&toCoord=-122.6815,45.5231&toPlaceId=portland:park:101&confirmPlace=1", true);
    expect(requestTrip).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Example Park");
    expect(container.textContent).toContain("Confirm the approximate arrival point");
    await act(async () => { fireEvent.submit(container.querySelector("form")); });
    expect(requestTrip).toHaveBeenCalledWith(expect.objectContaining({ fromPlace: "8356", toCoord: "-122.6815,45.5231" }));
    expect(container.querySelector('[data-test-id="query"]').textContent).toContain("toPlaceId=portland%3Apark%3A101");
    expect(container.querySelector(".transit-planner-stop-summary").textContent).toContain("Example Park");
    act(() => container.querySelector<HTMLButtonElement>("#transit-planner-title + .transit-planner-edit").click());
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Swap origin and destination"]').click());
    await act(async () => { fireEvent.submit(container.querySelector("form")); });
    expect(requestTrip).toHaveBeenLastCalledWith(expect.objectContaining({ fromCoord: "-122.6815,45.5231", toPlace: "8356" }));
    expect(container.querySelector('[data-test-id="query"]').textContent).toContain("fromPlaceId=portland%3Apark%3A101");
  });

  it.each<[placesApi.PlaceCategory, string, string]>([
    ["library", "metro:library:central-library", "Central Library"],
    ["community-center", "metro:community-center:13", "Community Center"],
    ["community-garden", "portland:garden:37d4ec75-92b5-47dd-8b36-b8717e7a2cc5", "Community Garden"],
    ["farmers-market", "portland:market:1", "Farmers Market"],
    ["public-restroom", "portland:restroom:1", "Public Restroom"],
    ["heritage-tree", "portland:tree:51", "Heritage Tree"],
    ["grocery-store", "portland:grocery:1", "Grocery Store"],
    ["reuse-repair", "portland:reuse:1", "Reuse Organization"],
    ["csa-pickup", "portland:csa:1", "CSA Pickup"],
    ["bicycle-parking", "portland:bike:5220-1", "Bicycle Rack"]
  ])("leaves origin empty for a linked %s and clears stale identity when editing coordinates", async (category, id, name) => {
    const place: placesApi.InterestPlace = {
      id, name, category,
      coordinates: [-122.6815, 45.5231], arrival: "approximate", sourceUrl: "https://www.portlandmaps.com/"
    };
    vi.spyOn(placesApi, "usePlaceCatalog").mockReturnValue({
      places: [place], sources: placesApi.emptyPlaceSources(), retry: vi.fn()
    });
    await render(`/nearby/planner?toCoord=-122.6815,45.5231&toPlaceId=${id}&confirmPlace=1`, true);
    expect(container.textContent).toContain(name);
    expect(requestTrip).not.toHaveBeenCalled();
    expect(geoLocateCurrentPosition).not.toHaveBeenCalled();
    const input = container.querySelector<HTMLInputElement>("#planner-to");
    act(() => fireEvent.change(input, { target: { value: "-122.68,45.52" } }));
    expect(container.textContent).not.toContain(name);
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Swap origin and destination"]').click());
    expect(container.querySelector<HTMLInputElement>("#planner-from").value).toBe("-122.68,45.52");
  });

  it.each(["malformed", "blocked"])("keeps sidebar planning usable when recent storage is %s", async (failure) => {
    if (failure === "malformed") {
      localStorage.setItem("overworld:recent-journeys", "{invalid");
    } else {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("Storage blocked", "SecurityError");
      });
    }
    await render("/nearby/planner?from=8356&to=7777", true);
    act(() => container.querySelector<HTMLButtonElement>("#transit-planner-title + .transit-planner-edit").click());
    expect(container.textContent).toContain("Recent trips are unavailable on this device.");
    expect(container.textContent).toContain("Choose a trip");
    expect(container.querySelector(".transit-planner-recent")).toBeNull();
    if (failure === "malformed") {
      expect(localStorage.getItem("overworld:recent-journeys")).toBe("{invalid");
    }
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
    expect(localStorage.getItem("overworld:recent-journeys")).toBeNull();
    expect(geoLocateCurrentPosition).not.toHaveBeenCalled();
  });


});
