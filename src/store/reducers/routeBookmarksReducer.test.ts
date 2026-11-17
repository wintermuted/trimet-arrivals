import {
  ROUTE_BOOKMARK_GROUPS_FAILED
} from "../constants/routeBookmarks";
import { ROUTE_BOOKMARK_GROUPS_UPDATED } from "../constants/bookmarkSections";
import routeBookmarksReducer from "./routeBookmarksReducer";

describe("route bookmarks reducer", () => {
  it("clears the group storage error after a successful update", () => {
    const state = routeBookmarksReducer(
      { bookmarks: {}, groupsError: "Storage unavailable" },
      { type: ROUTE_BOOKMARK_GROUPS_UPDATED }
    );

    expect(state.groupsError).toBeUndefined();
  });

  it("records group storage failures", () => {
    const state = routeBookmarksReducer(
      { bookmarks: {} },
      {
        type: ROUTE_BOOKMARK_GROUPS_FAILED,
        payload: { error: "Storage unavailable" }
      }
    );

    expect(state.groupsError).toBe("Storage unavailable");
  });
});
