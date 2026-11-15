import { Button } from "@wintermuted/ui-theme/react";
import React from "react";
import { TrimetLocation } from "../../../store/reducers/data/arrivalsDataReducer";
import { OnBookmarkClick } from "./StopLocationView";

interface StopLocationHeaderProps {
  location: TrimetLocation;
  stopIsBookmarked: boolean;
  onBookmarkClick: OnBookmarkClick;
}

function getButton(
  location: TrimetLocation,
  stopIsBookmarked: boolean,
  onBookmarkClick: OnBookmarkClick
) {
  function onClick() {
    onBookmarkClick(location, stopIsBookmarked);
  }

  return (
    <Button
      type="button"
      variant="secondary"
      aria-pressed={stopIsBookmarked}
      onClick={onClick}
      className="transit-responsive-margin"
      style={{ marginBottom: ".5rem" }}
    >
      {stopIsBookmarked ? "Remove Bookmark" : "Add Bookmark"}
    </Button>
  );
}

function StopLocationHeader({
  location,
  onBookmarkClick,
  stopIsBookmarked
}: StopLocationHeaderProps) {
  return (
    <>
      <header
        className="transit-responsive-nowrap"
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          paddingTop: "1rem",
          paddingBottom: ".5rem",
          marginBottom: "1rem"
        }}
      >
        <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}>
          {location.desc}
        </h2>
        {getButton(location, stopIsBookmarked, onBookmarkClick)}
      </header>
      <hr />
    </>
  );
}

export default StopLocationHeader;
