import { vi, type Mock } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { getAlertsByRouteId } from "../api/trimet/alerts";
import { getRouteById } from "../api/trimet/routeConfig";
import LineDetailView from "../view/lineDetail/component/LineDetailView";
import LineDetailComponent from "../view/lineDetail/component/LineDetailComponent";

vi.mock("../api/trimet/routeConfig", () => ({
  getRouteById: vi.fn()
}));
vi.mock("../api/trimet/alerts", () => ({
  getAlertsByRouteId: vi.fn(() => Promise.resolve({ alert: [] }))
}));
vi.mock("../component/route/RouteListItem", () => ({ default: () => <div>Route details</div> }));
vi.mock("../view/bookmarks/container/RouteBookmarkButtonContainer", () => ({ default: () => null }));
vi.mock("../view/lineDetail/component/MapCard", () => ({ MapCard: () => null }));
vi.mock("../view/lineDetail/component/ScheduleCard", () => ({ ScheduleCard: () => null }));
vi.mock("../view/lineDetail/component/StopsCard", () => ({ StopsCard: () => null }));
vi.mock("../view/lineDetail/component/AlertsCard", () => ({ AlertsCard: () => null }));

describe("route detail availability", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
    (getAlertsByRouteId as Mock).mockResolvedValue({ alert: [] });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("shows an unavailable state for a route removed from the API", async () => {
    (getRouteById as Mock).mockResolvedValue({ route: [] });
    await act(async () => {
      root.render(<LineDetailView id={9} />);
    });

    expect(container.querySelector("[role=alert]").textContent).toBe(
      "This route is no longer available."
    );
  });

  it("shows an error when loading a route fails", async () => {
    (getRouteById as Mock).mockRejectedValue(new Error("network"));
    await act(async () => {
      root.render(<LineDetailView id={9} />);
    });

    expect(container.querySelector("[role=alert]").textContent).toBe(
      "Unable to load this route. Please try again."
    );
  });

  it("loads routed line details and alerts without a Redux provider", async () => {
    (getRouteById as Mock).mockResolvedValue({
      route: [{
        route: 9,
        id: 9,
        desc: "Powell",
        type: "bus",
        dir: [],
        routeColor: "",
        routeSortOrder: 9
      }]
    });
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/lines/9"]}>
          <Routes>
            <Route path="/lines/:id" element={<LineDetailComponent />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain("Route details");
    expect(container.textContent).toContain("No active alerts");
    expect(getRouteById).toHaveBeenCalledWith(9);
    expect(getAlertsByRouteId).toHaveBeenCalledWith(9);
  });
});
