import { vi, type Mock } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { getAlertsByRouteId } from "../api/trimet/alerts";
import { getRouteById } from "../api/trimet/routeConfig";
import LineDetailView from "../view/lineDetail/component/LineDetailView";

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
      root.render(<LineDetailView id={9} route={undefined} loadRouteData={vi.fn()} />);
    });

    expect(container.querySelector("[role=alert]").textContent).toBe(
      "This route is no longer available."
    );
  });

  it("shows an error when loading a route fails", async () => {
    (getRouteById as Mock).mockRejectedValue(new Error("network"));
    await act(async () => {
      root.render(<LineDetailView id={9} route={undefined} loadRouteData={vi.fn()} />);
    });

    expect(container.querySelector("[role=alert]").textContent).toBe(
      "Unable to load this route. Please try again."
    );
  });
});
