import React from "react";
import {
  useBookmarks,
  useBookmarkCommands,
} from "../../../state/bookmarks/BookmarksProvider";
import BookmarkedRoutes from "../component/BookmarkedRoutes";

export default function BookmarkedRoutesContainer() {
  const { routes } = useBookmarks();
  const { removeRoute } = useBookmarkCommands();
  return (
    <BookmarkedRoutes routes={Object.values(routes)} onRemove={removeRoute} />
  );
}
