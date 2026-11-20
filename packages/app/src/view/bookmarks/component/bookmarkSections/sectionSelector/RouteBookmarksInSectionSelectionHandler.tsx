import React from "react";
import { RouteBookmark } from "../../../../../api/localstorage/routeBookmarks";
import RouteBookmarksInSectionSelector from "./RouteBookmarksInSectionSelector";

interface Props {
  bookmarkSectionId: number;
  routesInSection: RouteBookmark[];
  allRoutes: RouteBookmark[];
  addRouteToBookmarkSection: (
    bookmarkSectionId: number,
    routeId: number
  ) => void;
  removeRouteFromBookmarkSection: (
    bookmarkSectionId: number,
    routeId: number
  ) => void;
}

export default function RouteBookmarksInSectionSelectionHandler({
  bookmarkSectionId,
  routesInSection,
  allRoutes,
  addRouteToBookmarkSection,
  removeRouteFromBookmarkSection
}: Props) {
  function onChange(_value, event) {
    if (event.action === "select-option") {
      addRouteToBookmarkSection(bookmarkSectionId, event.option.value);
    } else if (event.action === "remove-value" || event.action === "pop-value") {
      removeRouteFromBookmarkSection(bookmarkSectionId, event.removedValue.value);
    } else if (event.action === "clear") {
      routesInSection.forEach(route =>
        removeRouteFromBookmarkSection(bookmarkSectionId, route.route)
      );
    }
  }

  return (
    <RouteBookmarksInSectionSelector
      routesInSection={routesInSection}
      allRoutes={allRoutes}
      onChange={onChange}
    />
  );
}
