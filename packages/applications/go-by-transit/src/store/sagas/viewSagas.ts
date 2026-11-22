import { call, put } from "redux-saga/effects";
import { fetchStoredBookmarks } from "../../api/localstorage/bookmarks.localstorage";
import { fetchStoredBookmarkSections } from "../../api/localstorage/bookmarkSections";
import { fetchStoredRouteBookmarks } from "../../api/localstorage/routeBookmarks";
import { fetchStoredRouteBookmarkGroups } from "../../api/localstorage/routeBookmarkGroups";
import { CHANGE_VIEW, LOAD_BOOKMARKS_COMPLETE } from "../constants";
import {
  LOAD_BOOKMARK_SECTIONS_COMPLETE,
  LOAD_ROUTE_BOOKMARK_GROUPS_COMPLETE
} from "../constants/bookmarkSections";
import {
  LOAD_ROUTE_BOOKMARKS_COMPLETE,
  ROUTE_BOOKMARKS_FAILED,
  ROUTE_BOOKMARK_GROUPS_FAILED
} from "../constants/routeBookmarks";

interface ChangeViewAction {
  payload: {
    activeView: string;
  };
}

export function* changeView(action: ChangeViewAction) {
  try {
    yield put({
      payload: { activeView: action.payload.activeView },
      type: CHANGE_VIEW
    });
  } catch (e) {
    // console.error(e)
  }
}

export function* initialLoad() {
  try {
    const bookmarks = yield call(fetchStoredBookmarks);
    const bookmarkSections = yield call(fetchStoredBookmarkSections);
    let routeBookmarks;
    let routeBookmarkGroups;
    let routeBookmarksLoaded = false;
    let routeBookmarkGroupsLoaded = false;
    try {
      routeBookmarks = yield call(fetchStoredRouteBookmarks);
      routeBookmarksLoaded = true;
    } catch (error) {
      yield put({
        payload: {
          error:
            error instanceof Error
              ? error.message
              : "Route bookmarks could not be loaded."
        },
        type: ROUTE_BOOKMARKS_FAILED
      });
    }
    try {
      routeBookmarkGroups = yield call(fetchStoredRouteBookmarkGroups);
      routeBookmarkGroupsLoaded = true;
    } catch (error) {
      yield put({
        payload: {
          error:
            error instanceof Error
              ? error.message
              : "Route groups could not be loaded."
        },
        type: ROUTE_BOOKMARK_GROUPS_FAILED
      });
    }

    yield put({
      payload: { bookmarks },
      type: LOAD_BOOKMARKS_COMPLETE
    });

    yield put({
      payload: { bookmarkSections },
      type: LOAD_BOOKMARK_SECTIONS_COMPLETE
    });
    if (routeBookmarksLoaded) {
      yield put({
        payload: { bookmarks: routeBookmarks || {} },
        type: LOAD_ROUTE_BOOKMARKS_COMPLETE
      });
    }
    if (routeBookmarkGroupsLoaded) {
      yield put({
        payload: { routeBookmarkGroups: routeBookmarkGroups || {} },
        type: LOAD_ROUTE_BOOKMARK_GROUPS_COMPLETE
      });
    }
  } catch (e) {
    yield put({ type: "API_ERROR", error: e });
  }
}
