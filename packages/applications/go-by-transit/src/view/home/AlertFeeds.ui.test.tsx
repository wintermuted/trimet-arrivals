import { vi } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { Alert as AlertData } from "../../api/trimet/interfaces/alertsData";
import AllAlertsCard from "./AllAlertsCard";
import { SystemAlertsCard } from "./SystemAlertsCard";

const alert: AlertData = {
  id: 1,
  begin: 1,
  end: 0,
  desc: "Synthetic system notice",
  header_text: "Service notice",
  info_link_url: "",
  system_wide_flag: true,
  route: []
};

describe("home alert feeds", () => {
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

  it("distinguishes no global alerts from a failed request and offers retry", () => {
    act(() => root.render(
      <AllAlertsCard
        alertsData={[]}
        loading={false}
        error={false}
        onRefresh={vi.fn()}
      />
    ));
    expect(container.textContent).toContain("No route or stop alerts right now.");

    const onRefresh = vi.fn();
    act(() => root.render(
      <AllAlertsCard
        alertsData={undefined}
        loading={false}
        error={true}
        onRefresh={onRefresh}
      />
    ));
    expect(container.textContent).toContain("Could not load alerts");
    act(() => container.querySelector("button").click());
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("keeps last received system alerts visible after a refresh failure", () => {
    act(() => root.render(
      <SystemAlertsCard
        systemAlertsData={[alert]}
        loading={false}
        error={true}
        onRefresh={vi.fn()}
      />
    ));
    expect(container.textContent).toContain("Could not refresh system alerts");
    expect(container.textContent).toContain("Synthetic system notice");
  });
});
