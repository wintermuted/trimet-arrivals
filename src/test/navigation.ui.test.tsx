import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import ServiceNavigation from "../view/lines/component/ServiceNavigation";
import NearbySubNav from "../view/nearby/components/common/NearbySubNav";

describe("Wintermuted route navigation", () => {
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

  function render(path: string, children: React.ReactNode) {
    act(() =>
      root.render(
        <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
      )
    );
  }

  it("keeps Nearby deep links active and changes views through real links", () => {
    render(
      "/nearby/simple-routes/54?stop=368&direction=1",
      <NearbySubNav stopCount={5} routeCount={2} />
    );
    const links = Array.from(container.querySelectorAll("a"));

    expect(links.map(link => link.getAttribute("href"))).toEqual([
      "/nearby/simple-routes",
      "/nearby/stops",
      "/nearby/routes"
    ]);
    expect(links[0].getAttribute("aria-current")).toBe("page");
    expect(links[0].classList.contains("wm-tab-btn-active")).toBe(true);

    act(() => {
      links[1].dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })
      );
    });

    expect(links[1].getAttribute("aria-current")).toBe("page");
    expect(links[0].getAttribute("aria-current")).toBeNull();
    expect(links[1].textContent).toContain("Stops (5)");
  });

  it("preserves service destinations and identifies the current service", () => {
    render("/lines/streetcar", <ServiceNavigation />);
    const links = Array.from(container.querySelectorAll("a"));

    expect(links.map(link => link.getAttribute("href"))).toEqual([
      "/lines/all",
      "/lines/max",
      "/lines/streetcar",
      "/lines/bus",
      "/lines/wes"
    ]);
    expect(links[2].getAttribute("aria-current")).toBe("page");
    expect(
      container.querySelector('[aria-label="Transit services"]')
    ).not.toBeNull();
  });

  it("preserves line-detail breadcrumbs without introducing tab semantics", () => {
    render("/lines/54", <ServiceNavigation />);

    expect(
      Array.from(container.querySelectorAll("a")).map(link =>
        link.getAttribute("href")
      )
    ).toEqual(["/lines", "/lines/max"]);
    expect(container.querySelector('[aria-current="page"]').textContent).toBe(
      "54"
    );
    expect(container.querySelector('[role="tab"]')).toBeNull();
  });
});
