import { Button } from "@wintermuted/ui-theme/react";
import React from "react";
import FontAwesome from "react-fontawesome";
import { StopLocation } from "../../api/trimet/interfaces/types";
import "./BookmarkButton.css";

interface BookmarkIconParams {
  stopIsBookmarked: boolean;
}

function BookmarkIcon({ stopIsBookmarked }: BookmarkIconParams) {
  if (stopIsBookmarked) {
    return <FontAwesome name="bookmark" className="bookmarked" />;
  }

  return <FontAwesome name="bookmark" className="not-bookmarked" />;
}

export type BookmarkClick = (
  stopLocation: StopLocation,
  stopIsBookmarked: boolean
) => void;

interface Props {
  stopLocation: StopLocation;
  onBookmarkClick: BookmarkClick;
  stopIsBookmarked: boolean;
}

export default function BookmarkButton({
  onBookmarkClick,
  stopLocation,
  stopIsBookmarked = false
}: Props) {
  const onClick =
    onBookmarkClick &&
    onBookmarkClick.bind(this, stopLocation, stopIsBookmarked);
  return (
    <Button
      onClick={onClick}
      className="bookmark-button"
      variant="secondary"
      aria-pressed={stopIsBookmarked}
      aria-label={
        stopIsBookmarked ? "Remove stop bookmark" : "Bookmark this stop"
      }
    >
      <BookmarkIcon stopIsBookmarked={stopIsBookmarked} />
    </Button>
  );
}
