import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { Alert } from "../../../api/trimet/interfaces/alertsData";
import { TrimetRoute } from "../../../api/trimet/interfaces/routes";
import RouteAlerts from "./RouteAlerts";

const route = (id: number): TrimetRoute => ({
  id,
  route: id,
  desc: `Route ${id}`,
  routeColor: "000000",
  type: "bus",
  dir: []
});

const alert = (id: number, routeIds: number[] = []): Alert => ({
  id,
  begin: 1,
  end: 0,
  desc: `Route notice ${id}`,
  header_text: `Notice ${id}`,
  info_link_url: "",
  system_wide_flag: false,
  route: routeIds.map(route)
});

describe("route alerts states", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(props: React.ComponentProps<typeof RouteAlerts>) {
    act(() => root.render(<RouteAlerts {...props} />));
  }

  it("distinguishes a successful empty response from loading", () => {
    render({
      id: 54,
      alerts: [],
      loading: false,
      error: false,
      onRetry: jest.fn()
    });
    expect(container.textContent).toContain("No active alerts for this route.");
    expect(container.textContent).not.toContain("Loading route alerts");
  });

  it("keeps last received alerts visible and identifies refresh errors", () => {
    render({
      id: 54,
      alerts: [alert(1, [54]), alert(2, [8])],
      loading: false,
      error: true,
      onRetry: jest.fn()
    });
    expect(container.textContent).toContain("Could not refresh alerts");
    expect(container.textContent).toContain("Route notice 1");
    expect(container.textContent).not.toContain("Route notice 2");
  });

  it("offers a retry when the initial request fails", () => {
    const onRetry = jest.fn();
    render({
      id: 54,
      alerts: undefined,
      loading: false,
      error: true,
      onRetry
    });
    expect(container.textContent).toContain("Could not load alerts");
    act(() => container.querySelector("button").click());
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
