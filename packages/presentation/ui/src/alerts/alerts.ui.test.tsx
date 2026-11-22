import { fireEvent, render, screen } from "@testing-library/react";
import type { Alert, RouteConfigRoute } from "@overworld/trimet-client";
import { AllAlertsCard, StopAlertsCard, SystemAlertsCard } from "../alerts";

const route: RouteConfigRoute = {
  id: 15, route: 15, desc: "Route 15", type: "B", routeColor: "000000",
  routeSortOrder: 1, dir: [],
};
const alert: Alert = {
  id: 0, begin: 1, end: 0, header_text: "Service notice", desc: "Notice details",
  system_wide_flag: false, info_link_url: "https://example.com/notice", route: [route],
  location: [{ id: 101, desc: "Example stop", dir: "N", lat: 45, lng: -122, no_service_flag: false, passengerCode: "101" }],
};
const state = { loading: false, error: false, onRefresh: jest.fn(), loadingContent: <p role="status">Injected loading</p> };

describe("injected alert presentation", () => {
  it("retains received system alerts during a failed refresh and exposes initial loading", () => {
    const refresh = jest.fn();
    const { rerender } = render(<SystemAlertsCard {...state} onRefresh={refresh} error systemAlertsData={[alert]} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Showing the last received alerts");
    expect(screen.getByText("Notice details")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "More Info" })).toHaveAttribute("href", alert.info_link_url);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refresh).toHaveBeenCalledTimes(1);
    rerender(<SystemAlertsCard {...state} loading systemAlertsData={undefined} />);
    expect(screen.getByRole("status")).toHaveTextContent("Injected loading");
  });

  it("uses supplied route and stop navigation without requiring a router", () => {
    render(<AllAlertsCard {...state} alertsData={[alert]}
      renderStopLink={id => <button>Stop {id}</button>}
      renderRouteLink={id => <button>Route {id}</button>} />);
    expect(screen.getByRole("button", { name: "Stop 101" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Route 15" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders supplied scoped alerts and route indicators while distinguishing empty receipt from initial failure", () => {
    const { rerender } = render(<StopAlertsCard {...state} error alertsData={[alert]}
      renderRouteIndicator={id => <span>Injected route {id}</span>} />);
    expect(screen.getByText("Injected route 15")).toBeInTheDocument();
    expect(screen.getByText("Notice details")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not refresh alerts");
    rerender(<StopAlertsCard {...state} error alertsData={undefined} renderRouteIndicator={id => id} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load alerts for this stop");
    rerender(<StopAlertsCard {...state} alertsData={[]} renderRouteIndicator={id => id} />);
    expect(screen.getByRole("status")).toHaveTextContent("No active alerts for this stop");
  });
});
