import { Button } from "@wintermuted/ui-theme/react";
import React from "react";
import FontAwesome from "react-fontawesome";

interface Props {
  stopId: number;
  removeBookmarkFromSection: (stopId: number) => void;
}

export const RemoveBookmarkButton = ({
  stopId,
  removeBookmarkFromSection
}: Props) => {
  const onClick = removeBookmarkFromSection
    ? removeBookmarkFromSection.bind(this, stopId)
    : undefined;

  return (
    <Button
      onClick={onClick}
      title="Remove bookmark from Bookmark Section"
      className="close-button"
    >
      <FontAwesome name="times-circle" />
    </Button>
  );
};
