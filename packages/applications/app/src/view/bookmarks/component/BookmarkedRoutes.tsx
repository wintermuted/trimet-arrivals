import { Card, CardBody, CardHeader } from "@wintermuted/ui-theme/react";
import { isEmpty } from "lodash";
import React from "react";
import { RouteBookmark } from "../../../api/localstorage/routeBookmarks";
import BookmarkedRouteItem from "./BookmarkedRouteItem";

interface Props {
  routes: RouteBookmark[];
  onRemove: (routeId: number) => void;
}

export default function BookmarkedRoutes({ routes, onRemove }: Props) {
  return (
    <Card>
      <CardHeader>Routes</CardHeader>
      <CardBody>
        {isEmpty(routes) ? (
          <p>Bookmark a route to see it here.</p>
        ) : (
          <ul>
            {routes.map(route => (
              <BookmarkedRouteItem
                key={route.route}
                route={route}
                onRemove={onRemove}
              />
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
