import React from "react";
import { useSelector } from "react-redux";
import { useBookmarks } from "../../../state/bookmarks/BookmarksProvider";
import { timeOfLastLoadSelector } from "../../../store/selectors/stopSelectors";
import MainNavigationComponent from "../components/MainNavigationComponent";

export default function MainNavigationContainer() {
  const { stops } = useBookmarks();
  const timeOfLastLoad = useSelector(timeOfLastLoadSelector);
  return (
    <MainNavigationComponent
      numberOfBookmarks={Object.keys(stops).length}
      timeOfLastLoad={timeOfLastLoad}
    />
  );
}
