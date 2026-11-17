import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { getAlertsByRouteId } from "../api/trimet/alerts";
import { getRouteById } from "../api/trimet/routeConfig";
import LineDetailView from "../view/lineDetail/component/LineDetailView";

jest.mock("../api/trimet/routeConfig", () => ({
  getRouteById: jest.fn()
}));
jest.mock("../api/trimet/alerts", () => ({
  getAlertsByRouteId: jest.fn(() => Promise.resolve({ alert: [] }))
}));
jest.mock("../component/route/RouteListItem", () => () => <div>Route details</div>);
jest.mock("../view/bookmarks/container/RouteBookmarkButtonContainer", () => () => null);
jest.mock("../view/lineDetail/component/MapCard", () => ({ MapCard: () => null }));
jest.mock("../view/lineDetail/component/ScheduleCard", () => ({ ScheduleCard: () => null }));
jest.mock("../view/lineDetail/component/StopsCard", () => ({ StopsCard: () => null }));
jest.mock("../view/lineDetail/component/AlertsCard", () => ({ AlertsCard: () => null }));

describe("route detail availability", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    jest.clearAllMocks();
    (getAlertsByRouteId as jest.Mock).mockResolvedValue({ alert: [] });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("shows an unavailable state for a route removed from the API", async () => {
    (getRouteById as jest.Mock).mockResolvedValue({ route: [] });
    await act(async () => {
      root.render(<LineDetailView id={9} route={undefined} loadRouteData={jest.fn()} />);
    });

    expect(container.querySelector("[role=alert]").textContent).toBe(
      "This route is no longer available."
    );
  });

  it("shows an error when loading a route fails", async () => {
    (getRouteById as jest.Mock).mockRejectedValue(new Error("network"));
    await act(async () => {
      root.render(<LineDetailView id={9} route={undefined} loadRouteData={jest.fn()} />);
    });

    expect(container.querySelector("[role=alert]").textContent).toBe(
      "Unable to load this route. Please try again."
    );
  });
});
