import { call, put } from "redux-saga/effects";
import {
  removeStoredRouteBookmark as removeStoredRouteBookmarkRecord,
  storeRouteBookmark as storeRouteBookmarkRecord
} from "../../api/localstorage/routeBookmarks";
import { removeStoredRouteFromAllBookmarkGroups } from "../../api/localstorage/routeBookmarkGroups";
import {
  ROUTE_BOOKMARK_GROUPS_FAILED,
  ROUTE_BOOKMARKS_FAILED,
  ROUTE_BOOKMARKS_UPDATED
} from "../constants/routeBookmarks";
import { ROUTE_BOOKMARK_GROUPS_UPDATED } from "../constants/bookmarkSections";

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Route bookmarks could not be saved.";
}

export function* storeRouteBookmark(action) {
  try {
    const bookmarks = yield call(storeRouteBookmarkRecord, action.payload.route);
    yield put({
      payload: { bookmarks },
      type: ROUTE_BOOKMARKS_UPDATED
    });
  } catch (error) {
    yield put({
      payload: { error: errorMessage(error) },
      type: ROUTE_BOOKMARKS_FAILED
    });
  }
}

export function* removeRouteBookmark(action) {
  let routeBookmarkGroups;
  try {
    routeBookmarkGroups = yield call(
      removeStoredRouteFromAllBookmarkGroups,
      action.payload.routeId
    );
    yield put({
      payload: { routeBookmarkGroups },
      type: ROUTE_BOOKMARK_GROUPS_UPDATED
    });
  } catch (error) {
    yield put({
      payload: { error: errorMessage(error) },
      type: ROUTE_BOOKMARK_GROUPS_FAILED
    });
    return;
  }

  try {
    const bookmarks = yield call(
      removeStoredRouteBookmarkRecord,
      action.payload.routeId
    );
    yield put({
      payload: { bookmarks },
      type: ROUTE_BOOKMARKS_UPDATED
    });
  } catch (error) {
    yield put({
      payload: { error: errorMessage(error) },
      type: ROUTE_BOOKMARKS_FAILED
    });
  }
}
