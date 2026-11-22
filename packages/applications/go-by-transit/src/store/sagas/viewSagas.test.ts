import { call, put } from "redux-saga/effects";
import { fetchStoredBookmarks } from "../../api/localstorage/bookmarks.localstorage";
import { fetchStoredBookmarkSections } from "../../api/localstorage/bookmarkSections";
import { fetchStoredRouteBookmarks } from "../../api/localstorage/routeBookmarks";
import { fetchStoredRouteBookmarkGroups } from "../../api/localstorage/routeBookmarkGroups";
import { CHANGE_VIEW, LOAD_BOOKMARKS_COMPLETE } from "../constants";
import { LOAD_BOOKMARK_SECTIONS_COMPLETE } from "../constants/bookmarkSections";
import { LOAD_ROUTE_BOOKMARK_GROUPS_COMPLETE } from "../constants/bookmarkSections";
import { LOAD_ROUTE_BOOKMARKS_COMPLETE } from "../constants/routeBookmarks";
import { changeView, initialLoad } from "./viewSagas";

describe("viewSagas", () => {
  describe("showStops", () => {
    const changeViewData = changeView({
      payload: { activeView: "foo" }
    });

    it("dispatches the load arrivals event", () => {
      expect(changeViewData.next().value).toEqual(
        put({
          payload: {
            activeView: "foo"
          },
          type: CHANGE_VIEW
        })
      );
    });
  });

  describe("initialLoad", () => {
    const initialLoadGenerator = initialLoad();

    it("fetches locally stored bookmarks", () => {
      expect(initialLoadGenerator.next().value).toEqual(
        call(fetchStoredBookmarks)
      );
    });

    it("fetches locally stored bookmark sections", () => {
      expect(initialLoadGenerator.next().value).toEqual(
        call(fetchStoredBookmarkSections)
      );
    });

    it("fetches locally stored route bookmarks and groups", () => {
      expect(initialLoadGenerator.next().value).toEqual(
        call(fetchStoredRouteBookmarks)
      );
      expect(initialLoadGenerator.next().value).toEqual(
        call(fetchStoredRouteBookmarkGroups)
      );
    });

    it("dispatches an event indicating that the loading of bookmarks has completed", () => {
      expect(initialLoadGenerator.next().value).toEqual(
        put({
          payload: { bookmarks: undefined },
          type: LOAD_BOOKMARKS_COMPLETE
        })
      );
    });

    it("dispatches an event indicating that the loading of bookmarks has completed", () => {
      expect(initialLoadGenerator.next().value).toEqual(
        put({
          payload: { bookmarkSections: undefined },
          type: LOAD_BOOKMARK_SECTIONS_COMPLETE
        })
      );
    });

    it("dispatches the loaded route bookmarks and group membership", () => {
      expect(initialLoadGenerator.next().value).toEqual(
        put({
          payload: { bookmarks: {} },
          type: LOAD_ROUTE_BOOKMARKS_COMPLETE
        })
      );
      expect(initialLoadGenerator.next().value).toEqual(
        put({
          payload: { routeBookmarkGroups: {} },
          type: LOAD_ROUTE_BOOKMARK_GROUPS_COMPLETE
        })
      );
    });
  });
});
