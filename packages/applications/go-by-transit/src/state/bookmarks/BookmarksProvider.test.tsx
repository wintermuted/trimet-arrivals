import React from "react";
import { act, render, renderHook, screen } from "@testing-library/react";
import { vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import {
  BOOKMARKS,
  BOOKMARK_SECTIONS,
  ROUTE_BOOKMARKS,
  ROUTE_BOOKMARK_GROUPS,
  BOOKMARK_SHORTCUTS,
  fetchStoredRouteBookmarks,
  fetchStoredRouteBookmarkGroups,
  fetchStoredBookmarks,
  fetchStoredBookmarkSections,
} from "@overworld/bookmarks";
import type { StopLocation, TrimetRoute } from "@overworld/trimet-client";
import {
  BookmarksProvider,
  BookmarkStorageErrors,
  useBookmarks,
  useBookmarkCommands,
} from "./BookmarksProvider";
import RouteBookmarkButtonContainer from "../../view/bookmarks/container/RouteBookmarkButtonContainer";
import BookmarkSectionsContainer from "../../view/bookmarks/container/BookmarkSectionsContainer";

const stop: StopLocation = {
  locid: 340,
  id: 340,
  desc: "My stop",
  dir: "E",
  lat: 45,
  lng: -122,
  route: [],
};
const route: TrimetRoute = {
  route: 54,
  id: 54,
  desc: "My route",
  type: "B",
  dir: [],
  routeColor: "",
  routeSortOrder: 54,
};
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BookmarksProvider>{children}</BookmarksProvider>
);
const setup = () =>
  renderHook(
    () => ({ state: useBookmarks(), commands: useBookmarkCommands() }),
    { wrapper },
  );

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

it("initializes persisted stops, routes and groups without a Redux store", () => {
  localStorage.setItem(BOOKMARKS, JSON.stringify({ 340: stop }));
  localStorage.setItem(
    BOOKMARK_SECTIONS,
    JSON.stringify({
      0: { name: "Commute", order: 0, bookmarkedStops: [340] },
    }),
  );
  localStorage.setItem(
    ROUTE_BOOKMARKS,
    JSON.stringify({ version: 1, routes: { 54: route } }),
  );
  localStorage.setItem(
    ROUTE_BOOKMARK_GROUPS,
    JSON.stringify({ version: 1, groups: { 0: [54] } }),
  );
  const { result } = setup();
  expect(result.current.state.stops[340]).toEqual(stop);
  expect(result.current.state.routes[54].desc).toBe("My route");
  expect(result.current.state.sections[0].bookmarkedStops).toEqual([340]);
  expect(result.current.state.routeGroups[0]).toEqual([54]);
});

it.each([
  ["stops", BOOKMARKS],
  ["sections", BOOKMARK_SECTIONS],
  ["routes", ROUTE_BOOKMARKS],
  ["routeGroups", ROUTE_BOOKMARK_GROUPS],
] as const)(
  "keeps other domains available when %s initialization fails",
  (domain, key) => {
    localStorage.setItem(BOOKMARKS, JSON.stringify({ 340: stop }));
    localStorage.setItem(
      BOOKMARK_SECTIONS,
      JSON.stringify({
        0: { name: "Commute", order: 0, bookmarkedStops: [340] },
      }),
    );
    localStorage.setItem(
      ROUTE_BOOKMARKS,
      JSON.stringify({ version: 1, routes: { 54: route } }),
    );
    localStorage.setItem(
      ROUTE_BOOKMARK_GROUPS,
      JSON.stringify({ version: 1, groups: { 0: [54] } }),
    );
    localStorage.setItem(key, "{");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = setup();
    if (domain !== "routes")
      expect(result.current.state.routes[54].route).toBe(54);
    if (domain !== "stops")
      expect(result.current.state.stops[340]).toEqual(stop);
    if (domain !== "sections")
      expect(result.current.state.sections[0].name).toBe("Commute");
    if (domain !== "routeGroups")
      expect(result.current.state.routeGroups[0]).toEqual([54]);
    expect(result.current.state.errors[domain]).toBeTruthy();
    expect(localStorage.getItem(key)).toBe("{");
    render(
      <BookmarksProvider>
        <BookmarkStorageErrors />
      </BookmarksProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bookmarks could not be loaded or saved",
    );
  },
);

it("persists consecutive collection mutations, preserves stop/route separation and removes shortcuts", () => {
  const { result } = setup();
  act(() => {
    const commands = result.current.commands;
    commands.bookmarkStop(stop);
    commands.bookmarkRoute(route);
    commands.createSection("First");
    commands.createSection("Second");
    commands.addStopToSection(0, 340);
    commands.addRouteToSection(0, 54);
    commands.renameSection(0, "Commute");
  });
  expect(Object.keys(result.current.state.sections)).toEqual(["0", "1"]);
  expect(fetchStoredBookmarkSections()[0]).toEqual({
    name: "Commute",
    order: 0,
    bookmarkedStops: [340],
  });
  expect(fetchStoredRouteBookmarkGroups()).toEqual({ 0: [54] });
  localStorage.setItem(
    BOOKMARK_SHORTCUTS,
    JSON.stringify({ home_location: 340, home_commute: 54 }),
  );
  act(() => {
    result.current.commands.removeRoute(54);
    result.current.commands.clearSectionStops(0);
  });
  expect(fetchStoredRouteBookmarks()).toEqual({});
  expect(fetchStoredBookmarks()).toEqual({ 340: stop });
  expect(fetchStoredRouteBookmarkGroups()).toEqual({});
  expect(JSON.parse(localStorage.getItem(BOOKMARK_SHORTCUTS)!)).toEqual({
    home_location: 340,
  });
  act(() => result.current.commands.removeStop(340));
  expect(result.current.state.stops).toEqual({});
  expect(JSON.parse(localStorage.getItem(BOOKMARK_SHORTCUTS)!)).toEqual({});
});

it("does not publish failed stop writes and clears the error after a successful retry", () => {
  const { result } = setup();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const write = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new Error("quota exceeded");
    });
  act(() => result.current.commands.bookmarkStop(stop));
  expect(result.current.state.stops).toEqual({});
  expect(result.current.state.errors.stops).toBe("quota exceeded");
  write.mockRestore();
  act(() => result.current.commands.bookmarkStop(stop));
  expect(result.current.state.stops[340]).toEqual(stop);
  expect(result.current.state.errors.stops).toBeUndefined();
});

it("retains a route if group cleanup fails and reflects successful cleanup if the later route write fails", () => {
  const { result } = setup();
  act(() => {
    result.current.commands.bookmarkRoute(route);
    result.current.commands.addRouteToSection(0, 54);
  });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const originalWrite = Storage.prototype.setItem;
  const write = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(function (key, value) {
      if (key === ROUTE_BOOKMARK_GROUPS) throw new Error("groups blocked");
      originalWrite.call(this, key, value);
    });
  act(() => result.current.commands.removeRoute(54));
  expect(result.current.state.routes[54]).toBeDefined();
  expect(result.current.state.routeGroups[0]).toEqual([54]);
  write.mockImplementation(function (key, value) {
    if (key === ROUTE_BOOKMARKS) throw new Error("route blocked");
    originalWrite.call(this, key, value);
  });
  act(() => result.current.commands.removeRoute(54));
  expect(result.current.state.routeGroups).toEqual({});
  expect(result.current.state.routes[54]).toBeDefined();
  expect(result.current.state.errors.routes).toBe("route blocked");
  write.mockRestore();
  act(() => result.current.commands.removeRoute(54));
  expect(result.current.state.routes).toEqual({});
});

it("removes section membership without deleting the underlying stop or route bookmark", () => {
  const { result } = setup();
  act(() => {
    result.current.commands.bookmarkStop(stop);
    result.current.commands.bookmarkRoute(route);
    result.current.commands.createSection("Commute");
    result.current.commands.addStopToSection(0, 340);
    result.current.commands.addRouteToSection(0, 54);
    result.current.commands.removeSection(0);
  });
  expect(result.current.state.sections).toEqual({});
  expect(fetchStoredRouteBookmarkGroups()).toEqual({});
  expect(fetchStoredBookmarks()[340]).toEqual(stop);
  expect(fetchStoredRouteBookmarks()[54].route).toBe(54);
});

it("updates real route controls together and restores their state after remount", () => {
  const controls = (
    <BookmarksProvider>
      <RouteBookmarkButtonContainer route={route} />
      <RouteBookmarkButtonContainer route={route} />
    </BookmarksProvider>
  );
  const view = render(controls);
  act(() =>
    screen.getAllByRole("button", { name: "Bookmark Route 54" })[0].click(),
  );
  expect(
    screen.getAllByRole("button", { name: "Remove Route 54 bookmark" }),
  ).toHaveLength(2);
  view.unmount();
  render(controls);
  expect(
    screen.getAllByRole("button", { name: "Remove Route 54 bookmark" }),
  ).toHaveLength(2);
  act(() =>
    screen
      .getAllByRole("button", { name: "Remove Route 54 bookmark" })[1]
      .click(),
  );
  expect(
    screen.getAllByRole("button", { name: "Bookmark Route 54" }),
  ).toHaveLength(2);
});

it("creates, renames, groups and removes a collection through the migrated controls", async () => {
  localStorage.setItem(
    ROUTE_BOOKMARKS,
    JSON.stringify({ version: 1, routes: { 54: route } }),
  );
  const user = userEvent.setup();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  render(
    <MemoryRouter>
      <BookmarksProvider>
        <BookmarkSectionsContainer />
      </BookmarksProvider>
    </MemoryRouter>,
  );
  await user.type(
    screen.getByRole("textbox", { name: "Bookmark Section Name" }),
    "Commute",
  );
  await user.click(screen.getByRole("button", { name: "Create" }));
  expect(screen.getByRole("heading", { name: "Commute" })).toBeInTheDocument();
  expect(
    screen.getByRole("textbox", { name: "Bookmark Section Name" }),
  ).toHaveValue("");
  await user.click(
    screen.getByRole("button", { name: "Edit bookmark section" }),
  );
  const name = screen.getByRole("textbox", { name: "Bookmark section name" });
  await user.clear(name);
  await user.type(name, "Work");
  expect(fetchStoredBookmarkSections()[0].name).toBe("Work");
  await user.click(
    screen.getByRole("combobox", { name: "Routes in this bookmark section" }),
  );
  await user.click(screen.getByRole("option", { name: "Route 54: My route" }));
  expect(fetchStoredRouteBookmarkGroups()).toEqual({ 0: [54] });
  await user.click(
    screen.getByRole("button", { name: "Remove Bookmark Section" }),
  );
  expect(fetchStoredBookmarkSections()).toEqual({});
  expect(fetchStoredRouteBookmarkGroups()).toEqual({});
  expect(fetchStoredRouteBookmarks()[54].route).toBe(54);
  expect(
    screen.getByText("Add a bookmark section to begin organizing bookmarks."),
  ).toBeInTheDocument();
});
