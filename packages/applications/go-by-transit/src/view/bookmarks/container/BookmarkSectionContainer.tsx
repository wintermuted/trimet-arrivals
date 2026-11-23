import React from "react";
import {
  useBookmarks,
  useBookmarkCommands,
} from "../../../state/bookmarks/BookmarksProvider";
import BookmarkSectionComponent from "../component/bookmarkSections/BookmarkSectionComponent";

export default function BookmarkSectionContainer({
  bookmarkSectionId: id,
}: {
  bookmarkSectionId: number;
}) {
  const { stops, routes, sections, routeGroups } = useBookmarks();
  const commands = useBookmarkCommands();
  const section = sections[id];
  if (!section) return null;
  return (
    <BookmarkSectionComponent
      id={id}
      name={section.name}
      allBookmarks={Object.values(stops)}
      bookmarksInSection={section.bookmarkedStops
        .map((stopId) => stops[stopId])
        .filter(Boolean)}
      routesInSection={(routeGroups[id] || [])
        .map((routeId) => routes[routeId])
        .filter(Boolean)}
      removeBookmarkSection={commands.removeSection}
      removeBookmarkFromSection={commands.removeStopFromSection}
      removeRouteFromSection={commands.removeRouteFromSection}
      updateBookmarkSectionName={commands.renameSection}
    />
  );
}
