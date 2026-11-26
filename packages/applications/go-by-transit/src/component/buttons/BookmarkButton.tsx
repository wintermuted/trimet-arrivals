import { BookmarkToggle } from "@overworld/ui";
import React from "react";
import { StopLocation } from "../../api/trimet/interfaces/types";

export type BookmarkClick = (
  stopLocation: StopLocation,
  stopIsBookmarked: boolean,
  event?: React.MouseEvent<HTMLButtonElement>,
) => void;

interface Props {
  stopLocation: StopLocation;
  onBookmarkClick: BookmarkClick;
  stopIsBookmarked: boolean;
  showLabel?: boolean;
}

export default function BookmarkButton({
  onBookmarkClick,
  stopLocation,
  stopIsBookmarked = false,
  showLabel = false,
}: Props) {
  return (
    <BookmarkToggle
      onClick={(event) =>
        onBookmarkClick(stopLocation, stopIsBookmarked, event)
      }
      isBookmarked={stopIsBookmarked}
      bookmarkLabel="Bookmark this stop"
      removeLabel="Remove stop bookmark"
      showLabel={showLabel}
      variant="secondary"
    />
  );
}
