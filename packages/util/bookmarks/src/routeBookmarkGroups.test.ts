import { vi } from "vitest";
import {
  addStoredRouteToBookmarkGroup,
  fetchStoredRouteBookmarkGroups,
  removeStoredRouteFromAllBookmarkGroups,
  removeStoredRouteFromBookmarkGroup,
  ROUTE_BOOKMARK_GROUPS
} from "./routeBookmarkGroups";

describe("route bookmark groups local storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps route membership separate from existing stop sections", () => {
    const oldSections = {
      2: { name: "Commute", order: 0, bookmarkedStops: [123, 456] }
    };
    localStorage.setItem("BOOKMARK_SECTIONS", JSON.stringify(oldSections));

    addStoredRouteToBookmarkGroup(2, 9);
    addStoredRouteToBookmarkGroup(2, 9);

    expect(fetchStoredRouteBookmarkGroups()).toEqual({ 2: [9] });
    expect(JSON.parse(localStorage.getItem(ROUTE_BOOKMARK_GROUPS))).toEqual({
      version: 1,
      groups: { 2: [9] }
    });
    expect(JSON.parse(localStorage.getItem("BOOKMARK_SECTIONS"))).toEqual(
      oldSections
    );
  });

  it("deduplicates memberships and preserves other groups", () => {
    localStorage.setItem(
      ROUTE_BOOKMARK_GROUPS,
      JSON.stringify({
        version: 1,
        groups: { 1: [9, 9], 2: [12] }
      })
    );

    expect(fetchStoredRouteBookmarkGroups()).toEqual({ 1: [9], 2: [12] });
    expect(removeStoredRouteFromBookmarkGroup(1, 9)).toEqual({ 2: [12] });
  });

  it("removes a route from all groups when its bookmark is deleted", () => {
    addStoredRouteToBookmarkGroup(1, 9);
    addStoredRouteToBookmarkGroup(2, 9);
    addStoredRouteToBookmarkGroup(2, 12);

    expect(removeStoredRouteFromAllBookmarkGroups(9)).toEqual({ 2: [12] });
  });

  it("rejects malformed memberships without replacing stored data", () => {
    const malformed = JSON.stringify({
      version: 1,
      groups: { 1: [9, "10"] }
    });
    localStorage.setItem(ROUTE_BOOKMARK_GROUPS, malformed);

    expect(() => fetchStoredRouteBookmarkGroups()).toThrow(
      "Stored route groups contain malformed records."
    );
    expect(localStorage.getItem(ROUTE_BOOKMARK_GROUPS)).toBe(malformed);
  });

  it("does not overwrite unsupported or unavailable storage", () => {
    localStorage.setItem(
      ROUTE_BOOKMARK_GROUPS,
      JSON.stringify({ version: 2, groups: {} })
    );
    const unsupported = localStorage.getItem(ROUTE_BOOKMARK_GROUPS);
    expect(() => addStoredRouteToBookmarkGroup(1, 9)).toThrow(
      "Stored route groups have an unsupported format."
    );
    expect(localStorage.getItem(ROUTE_BOOKMARK_GROUPS)).toBe(unsupported);

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    expect(() => fetchStoredRouteBookmarkGroups()).toThrow(
      "Storage unavailable"
    );
    vi.restoreAllMocks();
    localStorage.removeItem(ROUTE_BOOKMARK_GROUPS);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    expect(() => addStoredRouteToBookmarkGroup(1, 9)).toThrow(
      "Storage unavailable"
    );
  });
});
