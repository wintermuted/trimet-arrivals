import React from "react";
import type { TrimetRoute } from "../../../api/trimet/interfaces/routes";
import {
  useBookmarks,
  useBookmarkCommands,
  useBookmarkError,
} from "../../../state/bookmarks/BookmarksProvider";
import RouteBookmarkButton from "../component/RouteBookmarkButton";

export default function RouteBookmarkButtonContainer({
  route,
}: {
  route: TrimetRoute;
}) {
  const { routes } = useBookmarks();
  const commands = useBookmarkCommands();
  const error = useBookmarkError("routes", "routeGroups");
  return (
    <RouteBookmarkButton
      route={route}
      error={error}
      isBookmarked={Boolean(routes[route.route])}
      onBookmark={commands.bookmarkRoute}
      onRemove={commands.removeRoute}
    />
  );
}
