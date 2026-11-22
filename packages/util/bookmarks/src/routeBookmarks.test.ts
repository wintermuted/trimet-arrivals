import {
  fetchStoredRouteBookmarks,
  removeStoredRouteBookmark,
  ROUTE_BOOKMARKS,
  storeRouteBookmark
} from "./routeBookmarks";
import type { RouteConfigRoute as TrimetRoute } from "@overworld/trimet-client";

function makeRoute(id: number, desc: string): TrimetRoute {
  return {
    routeColor: "",
    route: id,
    id,
    type: "bus",
    dir: [],
    desc,
    routeSortOrder: id
  };
}

describe("routeBookmarks local storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("keeps route bookmarks separate, versioned, and duplicate-safe", () => {
    expect(fetchStoredRouteBookmarks()).toEqual({});
    localStorage.setItem("BOOKMARKS", JSON.stringify({ 123: { id: 123 } }));

    storeRouteBookmark(makeRoute(9, "Powell"));
    storeRouteBookmark(makeRoute(9, "Powell"));

    expect(fetchStoredRouteBookmarks()).toEqual({
      9: { route: 9, desc: "Powell", type: "bus" }
    });
    expect(JSON.parse(localStorage.getItem(ROUTE_BOOKMARKS))).toEqual({
      version: 1,
      routes: { 9: { route: 9, desc: "Powell", type: "bus" } }
    });
    expect(JSON.parse(localStorage.getItem("BOOKMARKS"))).toEqual({
      123: { id: 123 }
    });
  });

  it("rejects malformed records without replacing the stored data", () => {
    const malformed = JSON.stringify({
      version: 1,
      routes: {
        9: { route: "9", desc: "Powell", type: "bus" },
        10: { route: 10, desc: "Division", type: "bus" }
      }
    });
    localStorage.setItem(ROUTE_BOOKMARKS, malformed);

    expect(() => fetchStoredRouteBookmarks()).toThrow(
      "Stored route bookmarks contain malformed records."
    );
    expect(localStorage.getItem(ROUTE_BOOKMARKS)).toBe(malformed);
  });

  it("rejects malformed or unavailable storage instead of overwriting it", () => {
    localStorage.setItem(ROUTE_BOOKMARKS, "{");
    expect(() =>
      storeRouteBookmark(makeRoute(9, "Powell"))
    ).toThrow("Stored route bookmarks are malformed.");
    expect(localStorage.getItem(ROUTE_BOOKMARKS)).toBe("{");

    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    expect(() => fetchStoredRouteBookmarks()).toThrow("Storage unavailable");

    jest.restoreAllMocks();
    localStorage.removeItem(ROUTE_BOOKMARKS);
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    expect(() => storeRouteBookmark(makeRoute(9, "Powell"))).toThrow(
      "Storage unavailable"
    );
  });

  it("removes a route while preserving other route bookmarks", () => {
    storeRouteBookmark(makeRoute(9, "Powell"));
    storeRouteBookmark(makeRoute(10, "Division"));

    expect(removeStoredRouteBookmark(9)).toEqual({
      10: { route: 10, desc: "Division", type: "bus" }
    });
  });
});
