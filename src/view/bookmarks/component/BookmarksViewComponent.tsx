import React from "react";

import { StopLocation } from "../../../api/trimet/interfaces/types";
import BookmarkSectionsContainer from "../container/BookmarkSectionsContainer";
import BookmarkedStops from "./BookmarkedStops";
import BookmarkedRoutesContainer from "../container/BookmarkedRoutesContainer";
import BookmarkShortcutsEditor from "./BookmarkShortcutsEditor";
import "./BookmarksViewComponent.css";

interface Props {
  bookmarks: StopLocation[];
  routeBookmarkError?: string;
}

export default function BookmarksViewComponent(props: Props) {
  const { bookmarks, routeBookmarkError } = props;

  return (
    <div id="bookmarks-view-container" className="transit-container">
      <br />
      {routeBookmarkError && <p role="alert">{routeBookmarkError}</p>}
      <div className="transit-columns">
        <div className="transit-column">
          <BookmarkedStops bookmarks={bookmarks} />
          <br />
          <BookmarkedRoutesContainer />
        </div>
        <div className="transit-column">
          <BookmarkShortcutsEditor />
          <br />
          <BookmarkSectionsContainer />
        </div>
      </div>
    </div>
  );
}
