import { filter, find, omit } from "lodash";

export interface BookmarkSectionProps {
  name: string;
  order: number;
  bookmarkedStops: number[];
}

export interface BookmarkSectionsProps {
  [id: number]: BookmarkSectionProps;
}

export const BOOKMARK_SECTIONS = "BOOKMARK_SECTIONS";

export function fetchStoredBookmarkSections(): BookmarkSectionsProps {
  return JSON.parse(localStorage.getItem(BOOKMARK_SECTIONS) ?? "null") || {};
}

function updateStoredBookmarkSections(bookmarkSections: BookmarkSectionsProps) {
  localStorage.setItem(BOOKMARK_SECTIONS, JSON.stringify(bookmarkSections));
}

export function storeBookmarkSection(
  nextId: number,
  bookmarkSection: BookmarkSectionProps
) {
  const bookmarkSections = fetchStoredBookmarkSections();

  bookmarkSections[nextId] = bookmarkSection;

  updateStoredBookmarkSections(bookmarkSections);
}

export function removeStoredBookmarkSection(bookmarkSectionId: number) {
  const bookmarkSections = fetchStoredBookmarkSections();
  const updatedBookmarkSections = omit(bookmarkSections, bookmarkSectionId);

  updateStoredBookmarkSections(updatedBookmarkSections);
}

export function updateStoredBookmarkSection(
  bookmarkSectionId: number,
  stopId: number
) {
  const bookmarkSections = fetchStoredBookmarkSections();
  const bookmarkSection = bookmarkSections[bookmarkSectionId];
  const bookmarkInSection = find(
    bookmarkSection.bookmarkedStops,
    stop => stop === stopId
  );

  if (!bookmarkInSection) {
    bookmarkSection.bookmarkedStops.push(stopId);
    updateStoredBookmarkSections(bookmarkSections);
  }
}

export function removeStoredBookmarkFromSection(
  bookmarkSectionId: number,
  stopId: number
) {
  const bookmarkSections = fetchStoredBookmarkSections();
  const bookmarkSection = bookmarkSections[bookmarkSectionId];
  const bookmarkSectionStops = bookmarkSection.bookmarkedStops;
  const bookmarkInSection = find(bookmarkSectionStops, stop => stop === stopId);

  if (bookmarkInSection) {
    bookmarkSections[bookmarkSectionId].bookmarkedStops = filter(
      bookmarkSectionStops,
      id => id !== stopId
    );

    updateStoredBookmarkSections(bookmarkSections);
  }
}

export function removeAllStoredBookmarksInSection(bookmarkSectionId: number) {
  const bookmarkSections = fetchStoredBookmarkSections();
  const bookmarkSection = bookmarkSections[bookmarkSectionId];
  bookmarkSection.bookmarkedStops = [];

  updateStoredBookmarkSections(bookmarkSections);
}

export function updateStoredBookmarkSectionName(
  bookmarkSectionId: number,
  bookmarkSectionName: string
) {
  const bookmarkSections = fetchStoredBookmarkSections();
  const bookmarkSection = bookmarkSections[bookmarkSectionId];
  bookmarkSection.name = bookmarkSectionName;

  updateStoredBookmarkSections(bookmarkSections);
}
