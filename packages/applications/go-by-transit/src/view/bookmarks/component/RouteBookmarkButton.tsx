import { BookmarkToggle } from "@overworld/ui";
import React from "react";
import { TrimetRoute } from "../../../api/trimet/interfaces/routes";

interface Props {
  route: TrimetRoute;
  isBookmarked: boolean;
  error?: string;
  onBookmark: (route: TrimetRoute) => void;
  onRemove: (routeId: number) => void;
}

export default function RouteBookmarkButton({
  route,
  isBookmarked,
  error,
  onBookmark,
  onRemove,
}: Props) {
  return (
    <div>
      <BookmarkToggle
        onClick={() =>
          isBookmarked ? onRemove(route.route) : onBookmark(route)
        }
        isBookmarked={isBookmarked}
        bookmarkLabel={`Bookmark Route ${route.route}`}
        removeLabel={`Remove Route ${route.route} bookmark`}
        showLabel
        showIcon={false}
      />
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
