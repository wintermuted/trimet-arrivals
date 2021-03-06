import { StopLocation } from "../../api/trimet/types";
import {
  BOOKMARK_SECTION_NAME_UPDATE_REQUEST,
  BOOKMARK_SECTION_SELECT_REQUEST,
  CREATE_BOOKMARK_SECTION_REQUEST,
  REMOVE_ALL_BOOKMARKS_IN_SECTION_REQUEST,
  REMOVE_BOOKMARK_FROM_SECTION_REQUEST,
  REMOVE_BOOKMARK_SECTION_REQUEST,
  UPDATE_BOOKMARK_SECTION_NAME_REQUEST
} from "../constants/bookmarkSections";

export const sectionNameUpdateRequest = (name: string) => ({
  payload: { name },
  type: BOOKMARK_SECTION_NAME_UPDATE_REQUEST
});

export const createBookmarkSectionRequest = () => ({
  type: CREATE_BOOKMARK_SECTION_REQUEST
});

export const removeBookmarkSectionRequest = (bookmarkSectionId: number) => ({
  payload: { bookmarkSectionId },
  type: REMOVE_BOOKMARK_SECTION_REQUEST
});

export const removeBookmarkFromSectionRequest = (
  bookmarkSectionId: number,
  stopId: number
) => ({
  payload: { bookmarkSectionId, stopId },
  type: REMOVE_BOOKMARK_FROM_SECTION_REQUEST
});

export const bookmarkSectionSelectRequest = (
  selectedBookmarkSection: number,
  stopLocation: StopLocation
) => ({
  payload: { selectedBookmarkSection, stopLocation },
  type: BOOKMARK_SECTION_SELECT_REQUEST
});

export const addBookmarkToBookmarkSectionRequest = (
  selectedBookmarkSection: number,
  stopId: StopLocation
) => ({
  payload: { selectedBookmarkSection, stopId },
  type: BOOKMARK_SECTION_SELECT_REQUEST
});

export const removeAllBookmarksInSectionRequest = (
  bookmarkSectionId: number
) => ({
  payload: { bookmarkSectionId },
  type: REMOVE_ALL_BOOKMARKS_IN_SECTION_REQUEST
});

export const updateBookmarkSectionNameRequest = (
  bookmarkSectionId: number,
  bookmarkSectionName: string
) => ({
  payload: {
    bookmarkSectionId,
    bookmarkSectionName
  },
  type: UPDATE_BOOKMARK_SECTION_NAME_REQUEST
});
