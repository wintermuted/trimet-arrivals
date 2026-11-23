import {
  Card,
  CardBody,
  CardHeader,
  ListGroup,
  ListItem
} from "@wintermuted/ui-react";
import { isEmpty, map } from "lodash";
import React, { useEffect, useState } from "react";
import FontAwesome from "react-fontawesome";
import { Link } from "react-router-dom";
import { StoredBookmarks } from "../../api/localstorage/bookmarks.localstorage";
import {
  StopData,
  StopLocation,
  TrimetRoute
} from "../../api/trimet/interfaces/types";
import { getNearbyStops } from "../../api/trimet/stops";
import RouteIndicator from "../../component/route/RouteIndicator";

interface BookmarkProps {
  index: string;
  bookmark: StopLocation;
}

interface BookmarkItemProps {
  index: string;
  bookmark: StopLocation;
  stopData: StopData;
}

function BookmarkItemRoutes({
  stopLocations
}: {
  stopLocations: StopLocation[];
}) {
  return (
    <div>
      {stopLocations.map((stopLocation: StopLocation) => {
        return (
          <div key={stopLocation.id}>
            {stopLocation.route.map((route: TrimetRoute) => {
              return <RouteIndicator key={route.route} routeId={route.route} />;
            })}
          </div>
        );
      })}
    </div>
  );
}

function BookmarkItem({ index, bookmark, stopData }: BookmarkItemProps) {
  return (
    <ListItem key={index}>
      <div
        className="transit-responsive-nowrap"
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap"
        }}
      >
        <Link to={`/stop/${index}`}>{bookmark.desc}</Link>
        {stopData && (
          <div>
            <BookmarkItemRoutes stopLocations={stopData.location} />
          </div>
        )}
      </div>
    </ListItem>
  );
}

function Bookmark({ index, bookmark }: BookmarkProps) {
  const [stopInfo, setStopInfo] = useState(undefined);

  useEffect(() => {
    const location = {
      coords: {
        latitude: bookmark.lat,
        longitude: bookmark.lng
      }
    };
    getNearbyStops(location, 50).then((result: StopData) => {
      setStopInfo(result);
    });
  }, []);

  return <BookmarkItem index={index} bookmark={bookmark} stopData={stopInfo} />;
}

function getBookmarkedStops(bookmarks: StoredBookmarks) {
  return map(bookmarks, (bookmark: StopLocation, index) => {
    return <Bookmark index={index} bookmark={bookmark} />;
  });
}

interface Props {
  bookmarks: StoredBookmarks;
}

function BookmarksCard({ bookmarks }: Props) {
  return (
    <Card>
      <CardHeader as="h5">
        <FontAwesome name="bell" />
        Bookmarked Stops
      </CardHeader>
      <CardBody>Your favourite stops.</CardBody>
      <ListGroup>{getBookmarkedStops(bookmarks)}</ListGroup>
      <CardBody>
        <Link to="/bookmarks">Manage Bookmarks</Link>
      </CardBody>
    </Card>
  );
}

export default BookmarksCard;
