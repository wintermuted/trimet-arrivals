import { Button } from "@wintermuted/ui-react";
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
  onRemove
}: Props) {
  return (
    <div>
      <Button
        onClick={() =>
          isBookmarked ? onRemove(route.route) : onBookmark(route)
        }
        aria-pressed={isBookmarked}
      >
        {isBookmarked
          ? `Remove Route ${route.route} bookmark`
          : `Bookmark Route ${route.route}`}
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
