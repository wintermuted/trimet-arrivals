import { ThemeProvider } from "@wintermuted/ui-theme/react";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { StopLocation } from "../api/trimet/interfaces/types";
import BookmarkButton from "../component/buttons/BookmarkButton";
import AppFooter from "../component/footer/AppFooter";
import AddBookmarkSectionControl from "../view/bookmarks/component/bookmarkSections/AddBookmarkSectionControl";
import BookmarksInSectionSelectionHandler from "../view/bookmarks/component/bookmarkSections/sectionSelector/BookmarksInSectionSelectionHandler";
import MainNavigationMenu from "../view/mainNav/components/MainNavigationMenu";
import AllAlertsCard from "../view/home/AllAlertsCard";
import { SearchRadiusSelection } from "../view/nearby/components/SearchRadiusSelection";

const stop: StopLocation = {
  locid: 368,
  desc: "SW Broadway & Main",
  dir: "Eastbound",
  lat: 45.52,
  lng: -122.68
};

describe("Wintermuted control integration", () => {
  let container: HTMLDivElement;
  let root: Root;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    window.matchMedia = media => ({
      media,
      matches: false,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: () => false
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    window.matchMedia = originalMatchMedia;
  });

  it("offers labeled radius choices and forwards changes without an inert search action", () => {
    const handleRadiusSelectionChange = jest.fn(
      (event: React.ChangeEvent<HTMLSelectElement>) => event.target.value
    );
    act(() =>
      root.render(
        <SearchRadiusSelection
          radiusSize={1000}
          handleRadiusSelectionChange={handleRadiusSelectionChange}
        />
      )
    );
    const select = container.querySelector("select");
    expect(container.querySelector("label").htmlFor).toBe(select.id);
    expect(select.value).toBe("1000");
    expect(Array.from(select.options).map(option => option.value)).toEqual([
      "250",
      "500",
      "750",
      "1000",
      "1500",
      "2000",
      "2500",
      "5000"
    ]);
    expect(select.selectedOptions[0].textContent).toBe("1,000 ft");
    expect(container.querySelector("button")).toBeNull();
    act(() => {
      select.value = "2500";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(handleRadiusSelectionChange).toHaveBeenCalledTimes(1);
    expect(handleRadiusSelectionChange).toHaveReturnedWith("2500");
  });

  it("preserves bookmark callbacks and exposes the saved state", () => {
    const onBookmarkClick = jest.fn();
    const render = (saved: boolean) =>
      act(() =>
        root.render(
          <BookmarkButton
            stopLocation={stop}
            stopIsBookmarked={saved}
            onBookmarkClick={onBookmarkClick}
          />
        )
      );

    render(false);
    const button = container.querySelector("button");
    expect(button.getAttribute("aria-label")).toBe("Bookmark this stop");
    act(() => button.click());
    expect(onBookmarkClick.mock.calls[0].slice(0, 2)).toEqual([stop, false]);

    render(true);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.getAttribute("aria-label")).toBe("Remove stop bookmark");
  });

  it("creates bookmark sections through native form submission", () => {
    const createBookmarkSection = jest.fn();
    act(() =>
      root.render(
        <AddBookmarkSectionControl
          bookmarkSectionName="Morning commute"
          onSectionNameUpdate={jest.fn()}
          createBookmarkSection={createBookmarkSection}
        />
      )
    );

    const submit = container.querySelector("button");
    expect(submit.type).toBe("submit");
    act(() =>
      container
        .querySelector("form")
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    );
    expect(createBookmarkSection).toHaveBeenCalledTimes(1);
  });

  it("forwards shared multi-select removals to the existing bookmark actions", () => {
    const removeBookmarkFromSection = jest.fn();
    act(() =>
      root.render(
        <BookmarksInSectionSelectionHandler
          allBookmarks={[stop]}
          bookmarksInSection={[stop]}
          bookmarkSectionId={7}
          removeBookmarkFromSection={removeBookmarkFromSection}
          addBookmarkToBookmarkSection={jest.fn()}
          removeAllBookmarksFromSection={jest.fn()}
        />
      )
    );

    const remove = container.querySelector<HTMLElement>(
      '[aria-label="Remove 368: SW Broadway & Main"]'
    );
    expect(remove).not.toBeNull();
    act(() => remove.click());
    expect(removeBookmarkFromSection).toHaveBeenCalledWith(7, 368);
  });

  it("toggles native alert disclosure while preserving stop destinations", () => {
    act(() =>
      root.render(
        <MemoryRouter>
          <AllAlertsCard
            alertsData={[
              {
                id: 19,
                header_text: "Temporary stop closure",
                desc: "Use the next stop.",
                begin: 1800000000000,
                end: 1800003600000,
                system_wide_flag: false,
                info_link_url: "",
                route: [],
                location: [
                  {
                    id: 368,
                    desc: stop.desc,
                    dir: stop.dir,
                    lat: stop.lat,
                    lng: stop.lng,
                    no_service_flag: true,
                    passengerCode: "E"
                  }
                ]
              }
            ]}
          />
        </MemoryRouter>
      )
    );
    const details = container.querySelector("details");
    const summary = details.querySelector("summary");
    expect(details.open).toBe(false);
    act(() => summary.click());
    expect(details.open).toBe(true);
    expect(details.textContent).toContain("Use the next stop.");
    expect(details.querySelector("a").getAttribute("href")).toBe("/stop/368");
    act(() => summary.click());
    expect(details.open).toBe(false);
  });

  it("keeps Home current on Nearby deep links without changing its destination", () => {
    act(() =>
      root.render(
        <ThemeProvider>
          <MemoryRouter initialEntries={["/nearby/stops/368"]}>
            <MainNavigationMenu numberOfBookmarks={0} timeOfLastLoad="" />
          </MemoryRouter>
        </ThemeProvider>
      )
    );
    const home = container.querySelector(
      'nav[aria-label="Primary navigation"] a[href="/"]'
    );
    expect(home.getAttribute("aria-current")).toBe("page");
  });

  it("keeps the saved theme control in the footer and restores it on remount", () => {
    const render = () =>
      act(() =>
        root.render(
          <ThemeProvider>
            <MemoryRouter>
              <MainNavigationMenu numberOfBookmarks={0} timeOfLastLoad="" />
              <AppFooter />
            </MemoryRouter>
          </ThemeProvider>
        )
      );
    render();
    expect(container.querySelector("select")).toBeNull();
    const button = container.querySelector<HTMLButtonElement>(
      'footer button[aria-label="Toggle dark mode"]'
    );
    expect(button.textContent).toBe("Dark");
    expect(button.querySelector("svg").getAttribute("aria-hidden")).toBe("true");

    act(() => button.click());
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(button.textContent).toBe("Light");

    act(() => root.unmount());
    root = createRoot(container);
    render();
    expect(container.querySelector("footer button").textContent).toBe("Light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    act(() => container.querySelector<HTMLButtonElement>("footer button").click());
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(container.querySelector("footer button").textContent).toBe("Dark");
  });

  it("toggles from the resolved system theme rather than the system preference", () => {
    const matchMedia = window.matchMedia;
    window.matchMedia = media => ({ ...matchMedia(media), matches: true });
    act(() =>
      root.render(
        <ThemeProvider>
          <AppFooter />
        </ThemeProvider>
      )
    );
    const button = container.querySelector<HTMLButtonElement>("footer button");
    expect(button.textContent).toBe("Light");
    act(() => button.click());
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(button.textContent).toBe("Dark");
  });
});
