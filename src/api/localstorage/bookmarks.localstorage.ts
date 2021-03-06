import { omit } from "lodash";
import { StopLocation } from "../trimet/types";
import { fetchLocalStorageItemByKey, updateStoredItemByKey } from "./util";

export const BOOKMARKS = "BOOKMARKS";

interface StoredBookmarks {
  [locationId: number]: StopLocation;
}

export function fetchStoredBookmarks(): StoredBookmarks {
  return fetchLocalStorageItemByKey(BOOKMARKS);
}

function updateBookmarks(existingBookmarks) {
  updateStoredItemByKey(BOOKMARKS, existingBookmarks);
}

export function storeLocationBookmark(stopLocation: StopLocation) {
  const existingBookmarks = fetchStoredBookmarks();

  existingBookmarks[stopLocation.locid] = stopLocation;

  updateBookmarks(existingBookmarks);
}

export function removeStoredBookmark(locationId: number) {
  const bookmarks = fetchStoredBookmarks();
  const updatedBookmarks = omit(bookmarks, locationId);

  updateBookmarks(updatedBookmarks);
}
