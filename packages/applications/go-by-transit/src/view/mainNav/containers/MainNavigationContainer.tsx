import React from "react";
import { useBookmarks } from "../../../state/bookmarks/BookmarksProvider";
import { useArrivalRefreshTime } from "../../../state/arrivals/ArrivalsProvider";
import MainNavigationComponent from "../components/MainNavigationComponent";

export default function MainNavigationContainer() {
  const { stops } = useBookmarks();
  const timeOfLastLoad = useArrivalRefreshTime();
  return (
    <MainNavigationComponent
      numberOfBookmarks={Object.keys(stops).length}
      timeOfLastLoad={timeOfLastLoad}
    />
  );
}
