import { vi } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { Alert } from "../../../api/trimet/interfaces/alertsData";
import { AlertsCard } from "./AlertsCard";

const stopAlert = (id: number, stopId: number): Alert => ({
  id,
  begin: 1,
  end: 0,
  desc: `Stop notice ${id}`,
  header_text: `Notice ${id}`,
  info_link_url: "",
  system_wide_flag: false,
  route: [],
  location: [{
    id: stopId,
    desc: `Stop ${stopId}`,
    dir: "North",
    lat: 45,
    lng: -122,
    no_service_flag: false,
    passengerCode: String(stopId)
  }]
});

describe("stop alerts states", () => {
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

  function render(props: React.ComponentProps<typeof AlertsCard>) {
    act(() => {
      root.render(
        <MemoryRouter>
          <AlertsCard {...props} />
        </MemoryRouter>
      );
    });
  }

  it("shows a clear empty state and retries a failed stop alert request", () => {
    const onRefresh = vi.fn();
    render({
      alertsData: undefined,
      stopId: 123,
      loading: false,
      error: true,
      onRefresh
    });
    expect(container.textContent).toContain("Could not load alerts for this stop");
    act(() => container.querySelector("button").click());
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("keeps cached scoped alerts visible after a refresh fails", () => {
    render({
      alertsData: [stopAlert(1, 123), stopAlert(2, 456)],
      stopId: 123,
      loading: false,
      error: true,
      onRefresh: vi.fn()
    });
    expect(container.textContent).toContain("Could not refresh alerts");
    expect(container.textContent).toContain("Stop notice 1");
    expect(container.textContent).not.toContain("Stop notice 2");
  });
});
