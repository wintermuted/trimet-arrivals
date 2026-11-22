import { LOAD_ROUTE_BOOKMARK_GROUPS_COMPLETE } from "../constants/bookmarkSections";
import bookmarkSectionReducer from "./bookmarkSectionReducer";

describe("bookmark sections with separate route groups", () => {
  it("loads route membership without changing saved stop section records", () => {
    const savedSections = {
      2: { name: "Commute", order: 0, bookmarkedStops: [123, 456] }
    };
    const initialState = {
      bookmarkInputSectionName: "",
      bookmarkSections: savedSections,
      routeBookmarkGroups: {}
    };

    const state = bookmarkSectionReducer(initialState, {
      payload: { routeBookmarkGroups: { 2: [9] } },
      type: LOAD_ROUTE_BOOKMARK_GROUPS_COMPLETE
    });

    expect(state.bookmarkSections).toBe(savedSections);
    expect(state.routeBookmarkGroups).toEqual({ 2: [9] });
  });
});
