import { omit } from "lodash";
import type { StopLocation } from "@overworld/trimet-client";
import { removeShortcutsForBookmark } from "./bookmarkShortcuts";

export const BOOKMARKS = "BOOKMARKS";

export interface StoredBookmarks {
  [locationId: number]: StopLocation;
}

export function fetchStoredBookmarks(): StoredBookmarks {
  return JSON.parse(localStorage.getItem(BOOKMARKS) ?? "null") || {};
}

function updateBookmarks(existingBookmarks: StoredBookmarks) {
  localStorage.setItem(BOOKMARKS, JSON.stringify(existingBookmarks));
}

export function storeLocationBookmark(stopLocation: StopLocation) {
  const existingBookmarks = fetchStoredBookmarks();
  const id = stopLocation.locid ? stopLocation.locid : stopLocation.id;

  existingBookmarks[id] = stopLocation;

  updateBookmarks(existingBookmarks);
}

export function removeStoredBookmark(locationId: number) {
  const bookmarks = fetchStoredBookmarks();
  const updatedBookmarks = omit(bookmarks, locationId);

  updateBookmarks(updatedBookmarks);
  removeShortcutsForBookmark("stop", locationId);
}
