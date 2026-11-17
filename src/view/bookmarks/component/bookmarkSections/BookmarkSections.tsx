import { isEmpty } from "lodash";
import React from "react";
import {
  BookmarkSectionsProps
} from "../../../../store/reducers/bookmarkSectionReducer";
import BookmarkSectionContainer from "../../container/BookmarkSectionContainer";
import "./BookmarkSections.css";

interface Props {
  bookmarkSections: BookmarkSectionsProps;
}

export default function BookmarkSections({ bookmarkSections }: Props) {
  if (isEmpty(bookmarkSections)) {
    return (
      <div className="bookmark-section-message">
        Add a bookmark section to begin organizing bookmarks.
      </div>
    );
  }

  return (
    <div className="bookmark-section-list">
      {Object.keys(bookmarkSections).map(id => (
        <BookmarkSectionContainer key={id} bookmarkSectionId={Number(id)} />
      ))}
    </div>
  );
}
