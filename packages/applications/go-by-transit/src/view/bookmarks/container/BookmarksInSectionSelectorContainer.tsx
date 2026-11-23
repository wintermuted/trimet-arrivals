import React from "react";
import {
  useBookmarks,
  useBookmarkCommands,
} from "../../../state/bookmarks/BookmarksProvider";
import BookmarksInSectionSelectionHandler from "../component/bookmarkSections/sectionSelector/BookmarksInSectionSelectionHandler";

export default function BookmarksInSectionSelectorContainer({
  bookmarkSectionId,
}: {
  bookmarkSectionId: number;
}) {
  const { stops, sections } = useBookmarks();
  const commands = useBookmarkCommands();
  return (
    <BookmarksInSectionSelectionHandler
      bookmarkSectionId={bookmarkSectionId}
      allBookmarks={Object.values(stops)}
      bookmarksInSection={(sections[bookmarkSectionId]?.bookmarkedStops || [])
        .map((id) => stops[id])
        .filter(Boolean)}
      removeBookmarkFromSection={commands.removeStopFromSection}
      addBookmarkToBookmarkSection={commands.addStopToSection}
      removeAllBookmarksFromSection={commands.clearSectionStops}
    />
  );
}
