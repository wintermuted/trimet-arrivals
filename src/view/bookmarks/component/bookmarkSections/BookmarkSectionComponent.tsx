import { Card, CardHeader, CardBody } from "@wintermuted/ui-theme/react";
import { isEmpty, map } from "lodash";
import React, { Component } from "react";
import { StopLocation } from "../../../../api/trimet/interfaces/types";
import { RouteBookmark } from "../../../../api/localstorage/routeBookmarks";
import { RemoveBookmarkButton } from "../../../../component/buttons/RemoveBookmarkButton";
import StopContainer from "../../../nearbyStops/containers/StopContainer";
import "./BookmarkSectionComponent.css";
import { BookmarkSectionNav } from "./BookmarkSectionNav";
import BookmarkedRouteItem from "../BookmarkedRouteItem";

interface Props {
  name: string;
  id: number;
  bookmarksInSection: StopLocation[];
  routesInSection: RouteBookmark[];
  removeBookmarkSection: (bookmarkSectionId: number) => void;
  allBookmarks: StopLocation[];
  removeBookmarkFromSection: (
    bookmarkSectionId: number,
    stopId: number
  ) => void;
  removeRouteFromSection: (
    bookmarkSectionId: number,
    routeId: number
  ) => void;
  updateBookmarkSectionName: (
    bookmarkSectionId: number,
    bookmarkSectionName: string
  ) => void;
}

interface State {
  editMode: boolean;
}

export default class BookmarkSectionComponent extends Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      editMode: false
    };

    this.toggleEditMode = this.toggleEditMode.bind(this);
  }

  public getBookmarksInSection(
    bookmarkedStops: StopLocation[],
    id: number,
    hasRoutes: boolean
  ) {
    if (isEmpty(bookmarkedStops)) {
      if (hasRoutes) {
        return null;
      }
      return (
        <p className="bookmark-section-add-more">
          Add stops or routes using the edit controls.
        </p>
      );
    }
    const { removeBookmarkFromSection } = this.props;
    const onRemoveBookmarkFromSection = removeBookmarkFromSection
      ? removeBookmarkFromSection.bind(this, id)
      : undefined;

    return map(bookmarkedStops, stopLocation => {
      if (isEmpty(stopLocation)) {
        return null;
      }

      const locationId =
        stopLocation && stopLocation.locid
          ? stopLocation.locid
          : stopLocation.id;

      return (
        <li key={locationId}>
          <div className="bookmark-stop-wrapper">
            <div className="bookmark-flex-container">
              <div className="bookmark-stop-flex-item">
                <StopContainer
                  showArrivals={false}
                  locationId={locationId}
                  onRouteIndicatorClick={undefined}
                />
              </div>
              {this.state.editMode && (
                <div className="bookmark-remove-flex-item">
                  <RemoveBookmarkButton
                    stopId={locationId}
                    removeBookmarkFromSection={onRemoveBookmarkFromSection}
                  />
                </div>
              )}
            </div>
          </div>
        </li>
      );
    });
  }

  public render() {
    const {
      name,
      bookmarksInSection,
      routesInSection,
      id,
      updateBookmarkSectionName,
      removeBookmarkSection,
      removeRouteFromSection
    } = this.props;

    const onUpdateBookmarkSectionName = updateBookmarkSectionName
      ? updateBookmarkSectionName.bind(this, id)
      : undefined;
    const removeSection =
      removeBookmarkSection && removeBookmarkSection.bind(this, id);

    return (
      <Card key={id}>
        <CardHeader>
          <BookmarkSectionNav
            name={name}
            toggleEditMode={this.toggleEditMode}
            editMode={this.state.editMode}
            removeBookmarkSection={removeSection}
            updateBookmarkSectionName={onUpdateBookmarkSectionName}
            bookmarkSectionId={id}
          />
        </CardHeader>
        <CardBody>
          <ul className="bookmark-section-bookmarks">
            {this.getBookmarksInSection(
              bookmarksInSection,
              id,
              routesInSection.length > 0
            )}
            {routesInSection.map(route => (
              <BookmarkedRouteItem
                key={route.route}
                route={route}
                onRemove={
                  this.state.editMode
                    ? routeId => removeRouteFromSection(id, routeId)
                    : undefined
                }
              />
            ))}
          </ul>
        </CardBody>
      </Card>
    );
  }

  public toggleEditMode() {
    this.setState({
      editMode: !this.state.editMode
    });
  }
}
