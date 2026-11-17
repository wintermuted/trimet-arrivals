// tslint:disable-next-line:no-submodule-imports
import { ThemeProvider } from "@wintermuted/ui-theme/react";
import React, { act } from "react";
// tslint:disable-next-line:no-submodule-imports
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import ServiceNavigation from "../view/lines/component/ServiceNavigation";
import MainNavigationMenu from "../view/mainNav/components/MainNavigationMenu";
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
        <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>,
      ),
    );
  }

  it.each([
    ["/nearby/simple-routes/54", "/"],
    ["/lines/bus", "/lines/all"],
    ["/lines/54", "/lines/all"],
    ["/stops", "/stops"],
    ["/stop/123", "/stops"],
    ["/planner?from=100&to=200", "/planner"],
  ])("highlights the primary section for %s", (path, activeHref) => {
    render(
      path,
      <ThemeProvider>
        <MainNavigationMenu numberOfBookmarks={0} timeOfLastLoad="" />
      </ThemeProvider>,
    );

    const navigation = container.querySelector(
      '[aria-label="Primary navigation"]',
    );
    const currentLinks = navigation.querySelectorAll('[aria-current="page"]');
    expect(currentLinks.length).toBe(1);
    expect(currentLinks[0].getAttribute("href")).toBe(activeHref);
  });

  it("keeps primary navigation labels alongside decorative icons", () => {
    render("/", <MainNavigationMenu numberOfBookmarks={0} timeOfLastLoad="" />);
    const links = Array.from(
      container.querySelectorAll('[aria-label="Primary navigation"] a'),
    );
    expect(links.map((link) => link.textContent.trim())).toEqual([
      "Home",
      "Plan a trip",
      "Stops",
      "Lines",
      "Bookmarks",
    ]);
    links.forEach((link) => {
      expect(link.querySelector('.fa[aria-hidden="true"]')).not.toBeNull();
    });
  });

  it("opens time preferences from the right-aligned live clock menu", () => {
    render(
      "/",
      <ThemeProvider>
        <MainNavigationMenu numberOfBookmarks={0} timeOfLastLoad="" />
      </ThemeProvider>,
    );
    const menu =
      container.querySelector<HTMLDetailsElement>(".transit-time-menu");
    const summary = menu.querySelector("summary");

    expect(menu.open).toBe(false);
    expect(summary.textContent.trim()).toMatch(/\d{1,2}:\d{2}/);
    expect(summary.getAttribute("aria-label")).toContain("current time");
    expect(menu.querySelectorAll("select")).toHaveLength(2);
    expect(
      menu.previousElementSibling.classList.contains(
        "transit-navigation-content",
      ),
    ).toBe(true);

    act(() => summary.click());
    expect(menu.open).toBe(true);
    expect(menu.querySelector("legend").textContent).toBe("Time display");

    act(() =>
      summary.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(summary);
  });

  it("closes the navigation disclosure on selection and Escape", () => {
    render(
      "/",
      <ThemeProvider>
        <MainNavigationMenu numberOfBookmarks={0} timeOfLastLoad="" />
      </ThemeProvider>,
    );
    const toggle = container.querySelector<HTMLButtonElement>(
      "button[aria-controls]",
    );
    const content = document.getElementById(
      toggle.getAttribute("aria-controls"),
    );
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    act(() => toggle.click());
    act(() =>
      container.querySelector<HTMLAnchorElement>(".transit-brand").click(),
    );
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    act(() => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(content.classList.contains("is-open")).toBe(true);

    const lines = content.querySelector<HTMLAnchorElement>(
      'a[href="/lines/all"]',
    );
    act(() => lines.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(lines.getAttribute("aria-current")).toBe("page");

    act(() => toggle.click());
    lines.focus();
    act(() =>
      lines.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          key: "Escape",
        }),
      ),
    );
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(toggle);
  });

  it("keeps Nearby deep links active and changes views through real links", () => {
    render(
      "/nearby/simple-routes/54?stop=368&direction=1",
      <NearbySubNav stopCount={5} routeCount={2} />,
    );
    const links = Array.from(container.querySelectorAll("a"));

    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/nearby/simple-routes",
      "/nearby/stops",
    ]);
    expect(links.map((link) => link.textContent.trim())).toEqual([
      "Routes (2)",
      "Stops (5)",
    ]);
    expect(links[0].getAttribute("aria-current")).toBe("page");
    expect(links[0].classList.contains("wm-tab-btn-active")).toBe(true);

    act(() => {
      links[1].dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
      );
    });

    expect(links[1].getAttribute("aria-current")).toBe("page");
    expect(links[0].getAttribute("aria-current")).toBeNull();
    expect(links[1].textContent).toContain("Stops (5)");
  });

  it("preserves service destinations and identifies the current service", () => {
    render("/lines/streetcar", <ServiceNavigation />);
    const links = Array.from(container.querySelectorAll("a"));

    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/lines/all",
      "/lines/max",
      "/lines/streetcar",
      "/lines/bus",
      "/lines/wes",
    ]);
    expect(links[2].getAttribute("aria-current")).toBe("page");
    expect(
      container.querySelector('[aria-label="Transit services"]'),
    ).not.toBeNull();
  });

  it("preserves line-detail breadcrumbs without introducing tab semantics", () => {
    render("/lines/54", <ServiceNavigation />);

    expect(
      Array.from(container.querySelectorAll("a")).map((link) =>
        link.getAttribute("href"),
      ),
    ).toEqual(["/lines", "/lines/max"]);
    expect(container.querySelector('[aria-current="page"]').textContent).toBe(
      "54",
    );
    expect(container.querySelector('[role="tab"]')).toBeNull();
  });
});
