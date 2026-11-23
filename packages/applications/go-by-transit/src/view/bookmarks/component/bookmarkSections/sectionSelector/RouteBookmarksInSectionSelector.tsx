import { MultiSelect } from "@wintermuted/ui-react/select";
import React from "react";
import { RouteBookmark } from "../../../../../api/localstorage/routeBookmarks";

interface Props {
  routesInSection: RouteBookmark[];
  allRoutes: RouteBookmark[];
  onChange: (value: any, event: any) => void;
}

function formatRoutes(routes: RouteBookmark[]) {
  return routes.map(route => ({
    label: `Route ${route.route}: ${route.desc}`,
    value: route.route
  }));
}

export default function RouteBookmarksInSectionSelector({
  routesInSection,
  allRoutes,
  onChange
}: Props) {
  return (
    <MultiSelect
      aria-label="Routes in this bookmark section"
      options={formatRoutes(allRoutes)}
      isMulti={true}
      value={formatRoutes(routesInSection)}
      onChange={onChange}
    />
  );
}
