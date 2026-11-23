import React from "react";
import {
  useBookmarks,
  useBookmarkCommands,
} from "../../../state/bookmarks/BookmarksProvider";
import BookmarkSectionsComponent from "../component/bookmarkSections/BookmarkSectionsComponent";

export default function BookmarkSectionsContainer() {
  const { sections, sectionName } = useBookmarks();
  const commands = useBookmarkCommands();
  return (
    <BookmarkSectionsComponent
      bookmarkSectionName={sectionName}
      bookmarkSections={sections}
      onSectionNameUpdate={commands.setSectionName}
      createBookmarkSection={() => commands.createSection(sectionName)}
    />
  );
}
