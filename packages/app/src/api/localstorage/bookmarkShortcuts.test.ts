import { BOOKMARK_SHORTCUTS, readBookmarkShortcuts, setBookmarkShortcut } from "./bookmarkShortcuts";
import { BOOKMARKS, removeStoredBookmark } from "./bookmarks.localstorage";
import { removeStoredRouteBookmark, storeRouteBookmark } from "./routeBookmarks";

describe("bookmark shortcuts", () => {
  beforeEach(() => localStorage.clear());

  it("assigns, replaces and clears IDs without persisting bookmark details", () => {
    const stops = { 12: { desc: "First", lat: 45, lng: -122 }, 24: { desc: "Second" } };
    setBookmarkShortcut("home_location", 12, stops);
    setBookmarkShortcut("home_location", 24, stops);
    expect(() => setBookmarkShortcut("work_location", 99, stops)).toThrow("existing bookmark");
    expect(localStorage.getItem(BOOKMARK_SHORTCUTS)).toBe('{"home_location":24}');
    setBookmarkShortcut("home_location", undefined, stops);
    expect(readBookmarkShortcuts()).toEqual({});
  });

  it("cleans up only the matching bookmark type on deletion", () => {
    const stops = { 12: { locid: 12, desc: "Stop" } };
    localStorage.setItem(BOOKMARKS, JSON.stringify(stops));
    const routes = storeRouteBookmark({ route: 12, desc: "Route", type: "B" });
    setBookmarkShortcut("home_location", 12, stops);
    setBookmarkShortcut("work_location", 12, stops);
    setBookmarkShortcut("work_commute", 12, routes);
    removeStoredBookmark(12);
    expect(readBookmarkShortcuts()).toEqual({ work_commute: 12 });
    removeStoredRouteBookmark(12);
    expect(readBookmarkShortcuts()).toEqual({});
  });

  it("ignores invalid IDs and unrecognized fields", () => {
    localStorage.setItem(BOOKMARK_SHORTCUTS, '{"home_location":{"lat":45},"work_location":12,"work_commute":-3,"extra":18}');
    expect(readBookmarkShortcuts()).toEqual({ work_location: 12 });
  });
});
