import React from "react";
import {
  useBookmarks,
  useBookmarkCommands,
} from "../../../state/bookmarks/BookmarksProvider";
import RouteBookmarksInSectionSelectionHandler from "../component/bookmarkSections/sectionSelector/RouteBookmarksInSectionSelectionHandler";

export default function RouteBookmarksInSectionSelectorContainer({
  bookmarkSectionId,
}: {
  bookmarkSectionId: number;
}) {
  const { routes, routeGroups } = useBookmarks();
  const commands = useBookmarkCommands();
  return (
    <RouteBookmarksInSectionSelectionHandler
      bookmarkSectionId={bookmarkSectionId}
      allRoutes={Object.values(routes)}
      routesInSection={(routeGroups[bookmarkSectionId] || [])
        .map((id) => routes[id])
        .filter(Boolean)}
      addRouteToBookmarkSection={commands.addRouteToSection}
      removeRouteFromBookmarkSection={commands.removeRouteFromSection}
    />
  );
}
