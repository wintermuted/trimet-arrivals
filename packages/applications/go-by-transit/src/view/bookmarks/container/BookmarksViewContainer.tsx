import React from "react";
import {
  useBookmarks,
  useBookmarkError,
} from "../../../state/bookmarks/BookmarksProvider";
import BookmarksViewComponent from "../component/BookmarksViewComponent";

export default function BookmarksViewContainer() {
  const { stops } = useBookmarks();
  const error = useBookmarkError();
  return (
    <BookmarksViewComponent
      bookmarks={Object.values(stops)}
      routeBookmarkError={error}
    />
  );
}
