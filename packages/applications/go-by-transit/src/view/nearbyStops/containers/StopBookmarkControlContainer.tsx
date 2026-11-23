import React from "react";
import { StopLocation } from "../../../api/trimet/interfaces/types";
import BookmarkButton from "../../../component/buttons/BookmarkButton";
import {
  useBookmarks,
  useBookmarkCommands,
} from "../../../state/bookmarks/BookmarksProvider";

interface Props {
  locationId: number;
  stopLocation: StopLocation;
  showLabel?: boolean;
}

export default function StopBookmarkControlContainer(props: Props) {
  const { stops } = useBookmarks();
  const commands = useBookmarkCommands();
  return (
    <BookmarkButton
      {...props}
      stopIsBookmarked={Boolean(stops[props.locationId])}
      onBookmarkClick={(stop, bookmarked) =>
        bookmarked
          ? commands.removeStop(stop.locid || stop.id)
          : commands.bookmarkStop(stop)
      }
    />
  );
}
