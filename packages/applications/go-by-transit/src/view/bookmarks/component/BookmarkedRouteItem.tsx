import { Button } from "@wintermuted/ui-react";
import React from "react";
import { Link } from "react-router-dom";
import { RouteBookmark } from "../../../api/localstorage/routeBookmarks";

interface Props {
  route: RouteBookmark;
  onRemove?: (routeId: number) => void;
}

export default function BookmarkedRouteItem({ route, onRemove }: Props) {
  return (
    <li className="bookmark-stop-wrapper">
      <Link to={`/lines/${route.route}`}>
        Route {route.route}: {route.desc || "Transit route"}
      </Link>
      {onRemove && (
        <Button
          onClick={() => onRemove(route.route)}
          aria-label={`Remove Route ${route.route} from bookmarks`}
        >
          Remove
        </Button>
      )}
    </li>
  );
}
