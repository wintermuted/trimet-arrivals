import { Card, CardBody, CardHeader } from "@wintermuted/ui-react";
import { isEmpty, map } from "lodash";
import React from "react";
import { StopLocation } from "../../../api/trimet/interfaces/types";
import StopContainer from "../../nearbyStops/containers/StopContainer";

interface Props {
  bookmarks: StopLocation[];
}

function getBookmarks(bookmarks: StopLocation[]) {
  return map(bookmarks, (stopLocation: StopLocation) => {
    const locationId = stopLocation.locid
      ? stopLocation.locid
      : stopLocation.id;

    return (
      <div key={locationId} className="bookmark-stop-wrapper">
        <StopContainer locationId={locationId} showArrivals={false} />
      </div>
    );
  });
}

function BookmarkedStops({ bookmarks }: Props) {
  if (isEmpty(bookmarks)) {
    return (
      <Card>
        <CardHeader>Uncategorized Bookmarks</CardHeader>
        <CardBody>Bookmark a stop and see it here.</CardBody>
      </Card>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem" }}>Stops</h2>
      {getBookmarks(bookmarks)}
    </div>
  );
}

export default BookmarkedStops;
