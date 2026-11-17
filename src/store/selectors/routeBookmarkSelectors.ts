import { createSelector } from "reselect";
import { RootState } from "../reducers";

const selectRouteBookmarks = (state: RootState) =>
  state.routeBookmarksReducer.bookmarks;

export const routeBookmarksSelector = createSelector(
  selectRouteBookmarks,
  bookmarks => bookmarks
);

export const routeBookmarkErrorSelector = (state: RootState) =>
  [
    state.routeBookmarksReducer.routeError,
    state.routeBookmarksReducer.groupsError
  ]
    .filter(Boolean)
    .join(" ");

export const routeIsBookmarkedSelector = createSelector(
  [selectRouteBookmarks, (_state: RootState, routeId: number) => routeId],
  (bookmarks, routeId) => Boolean(bookmarks[routeId])
);
