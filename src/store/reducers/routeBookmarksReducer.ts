import {
  LOAD_ROUTE_BOOKMARKS_COMPLETE,
  ROUTE_BOOKMARKS_FAILED,
  ROUTE_BOOKMARK_GROUPS_FAILED,
  ROUTE_BOOKMARK_GROUPS_UPDATED,
  ROUTE_BOOKMARKS_UPDATED,
} from "../constants/routeBookmarks";
import { LOAD_ROUTE_BOOKMARK_GROUPS_COMPLETE } from "../constants/bookmarkSections";
import { RouteBookmarks } from "../../api/localstorage/routeBookmarks";

export interface RouteBookmarksReducerState {
  bookmarks: RouteBookmarks;
  routeError?: string;
  groupsError?: string;
}

interface Action {
  type: string;
  payload?: {
    bookmarks?: RouteBookmarks;
    error?: string;
  };
}

const initialState: RouteBookmarksReducerState = {
  bookmarks: {}
};

function updateRouteBookmarks(
  state: RouteBookmarksReducerState,
  action: Action
) {
  return {
    ...state,
    bookmarks: { ...(action.payload && action.payload.bookmarks) },
    routeError: undefined
  };
}

function failRouteBookmarks(
  state: RouteBookmarksReducerState,
  action: Action,
  isGroupError: boolean
) {
  const error = action.payload && action.payload.error;
  return isGroupError
    ? { ...state, groupsError: error }
    : { ...state, routeError: error };
}

export default function routeBookmarksReducer(
  state: RouteBookmarksReducerState = initialState,
  action: Action
): RouteBookmarksReducerState {
  switch (action.type) {
    case LOAD_ROUTE_BOOKMARKS_COMPLETE:
    case ROUTE_BOOKMARKS_UPDATED:
      return updateRouteBookmarks(state, action);
    case ROUTE_BOOKMARKS_FAILED:
      return failRouteBookmarks(state, action, false);
    case ROUTE_BOOKMARK_GROUPS_FAILED:
      return failRouteBookmarks(state, action, true);
    case LOAD_ROUTE_BOOKMARK_GROUPS_COMPLETE:
    case ROUTE_BOOKMARK_GROUPS_UPDATED:
      return { ...state, groupsError: undefined };
    default:
      return state;
  }
}
