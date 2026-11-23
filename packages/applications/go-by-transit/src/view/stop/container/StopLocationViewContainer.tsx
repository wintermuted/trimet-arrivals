import React from "react";
import {
  useBookmarks,
  useBookmarkCommands,
} from "../../../state/bookmarks/BookmarksProvider";
import StopLocationView from "../component/StopLocationView";

interface ReceivedProps {
  locationId: number;
}

export default function StopLocationViewContainer(props: ReceivedProps) {
  const { stops } = useBookmarks();
  const commands = useBookmarkCommands();
  return (
    <StopLocationView
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
