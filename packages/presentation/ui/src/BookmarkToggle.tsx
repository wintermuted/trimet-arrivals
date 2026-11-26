import { Button } from "@wintermuted/ui-react";
import React from "react";
import FontAwesome from "react-fontawesome";
import "./BookmarkToggle.css";

export interface BookmarkToggleProps {
  isBookmarked: boolean;
  bookmarkLabel: string;
  removeLabel: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  showLabel?: boolean;
  showIcon?: boolean;
  disabled?: boolean;
  variant?: React.ComponentProps<typeof Button>["variant"];
}

export function BookmarkToggle({
  isBookmarked,
  bookmarkLabel,
  removeLabel,
  onClick,
  showLabel = false,
  showIcon = true,
  disabled = false,
  variant,
}: BookmarkToggleProps) {
  const label = isBookmarked ? removeLabel : bookmarkLabel;
  return (
    <Button
      onClick={onClick}
      className={showIcon ? "bookmark-button" : undefined}
      variant={variant}
      disabled={disabled}
      aria-pressed={isBookmarked}
      aria-label={label}
    >
      {showIcon && (
        <FontAwesome
          name="bookmark"
          className={isBookmarked ? "bookmarked" : "not-bookmarked"}
          aria-hidden="true"
        />
      )}
      {showLabel && <span>{label}</span>}
    </Button>
  );
}
