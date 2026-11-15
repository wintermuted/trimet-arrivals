import React from "react";

import { StopLocation } from "../../../api/trimet/interfaces/types";
import BookmarkSectionsContainer from "../container/BookmarkSectionsContainer";
import BookmarkedStops from "./BookmarkedStops";
import "./BookmarksViewComponent.css";

interface Props {
  bookmarks: StopLocation[];
}

export default function BookmarksViewComponent(props: Props) {
  const { bookmarks } = props;

  return (
    <div id="bookmarks-view-container" className="transit-container">
      <br />
      <div className="transit-columns">
        <div className="transit-column">
          <BookmarkedStops bookmarks={bookmarks} />
        </div>
        <div className="transit-column">
          <BookmarkSectionsContainer />
        </div>
      </div>
    </div>
  );
}
