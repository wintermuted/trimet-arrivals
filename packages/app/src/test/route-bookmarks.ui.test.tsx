import { act } from "react";
import React from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { RouteBookmark } from "../api/localstorage/routeBookmarks";
import { TrimetRoute } from "../api/trimet/interfaces/routes";
import BookmarkedRouteItem from "../view/bookmarks/component/BookmarkedRouteItem";
import RouteBookmarkButton from "../view/bookmarks/component/RouteBookmarkButton";
import BookmarkSectionComponent from "../view/bookmarks/component/bookmarkSections/BookmarkSectionComponent";
import BookmarkSections from "../view/bookmarks/component/bookmarkSections/BookmarkSections";

jest.mock("../view/bookmarks/container/BookmarkSectionContainer", () => ({
  __esModule: true,
  default: ({ bookmarkSectionId }) => (
    <span data-testid="section-id">{typeof bookmarkSectionId}:{bookmarkSectionId}</span>
  )
}));

const route: TrimetRoute = {
  routeColor: "",
  route: 9,
  id: 9,
  type: "bus",
  dir: [],
  desc: "Powell",
  routeSortOrder: 9
};

const savedRoute: RouteBookmark = {
  route: 9,
  desc: "Powell",
  type: "bus"
};

describe("route bookmark controls", () => {
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

  it("adds and removes a route bookmark with an accessible pressed state", () => {
    const onBookmark = jest.fn();
    const onRemove = jest.fn();
    const render = (isBookmarked: boolean) =>
      act(() =>
        root.render(
          <RouteBookmarkButton
            route={route}
            isBookmarked={isBookmarked}
            onBookmark={onBookmark}
            onRemove={onRemove}
          />
        )
      );

    render(false);
    let button = container.querySelector("button");
    expect(button.textContent).toBe("Bookmark Route 9");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    act(() => button.click());
    expect(onBookmark).toHaveBeenCalledWith(route);

    render(true);
    button = container.querySelector("button");
    expect(button.textContent).toBe("Remove Route 9 bookmark");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    act(() => button.click());
    expect(onRemove).toHaveBeenCalledWith(9);
  });

  it("navigates to a saved route and can remove it from its group", () => {
    const onRemove = jest.fn();
    act(() =>
      root.render(
        <MemoryRouter>
          <ul>
            <BookmarkedRouteItem route={savedRoute} onRemove={onRemove} />
          </ul>
        </MemoryRouter>
      )
    );

    const link = container.querySelector("a");
    expect(link.getAttribute("href")).toBe("/lines/9");
    expect(link.textContent).toBe("Route 9: Powell");
    act(() => container.querySelector("button").click());
    expect(onRemove).toHaveBeenCalledWith(9);
  });

  it("does not show the empty-state prompt when a group has routes", () => {
    act(() =>
      root.render(
        <MemoryRouter>
          <BookmarkSectionComponent
            name="Commute"
            id={2}
            bookmarksInSection={[]}
            routesInSection={[savedRoute]}
            removeBookmarkSection={jest.fn()}
            allBookmarks={[]}
            removeBookmarkFromSection={jest.fn()}
            removeRouteFromSection={jest.fn()}
            updateBookmarkSectionName={jest.fn()}
          />
        </MemoryRouter>
      )
    );

    expect(container.querySelector(".bookmark-section-add-more")).toBeNull();
    expect(container.querySelector("a").textContent).toBe("Route 9: Powell");
  });

  it("passes numeric section IDs from saved section dictionaries", () => {
    act(() =>
      root.render(
        <BookmarkSections
          bookmarkSections={{
            2: { name: "Commute", order: 0, bookmarkedStops: [] }
          }}
        />
      )
    );

    expect(container.querySelector("[data-testid=section-id]").textContent).toBe(
      "number:2"
    );
  });
});
