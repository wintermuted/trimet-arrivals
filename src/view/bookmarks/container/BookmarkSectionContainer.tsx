import { connect } from "react-redux";
import {
  removeBookmarkFromSectionRequest,
  removeRouteFromBookmarkSectionRequest,
  removeBookmarkSectionRequest,
  updateBookmarkSectionNameRequest
} from "../../../store/action/bookmarkSectionActions";
import { RootState } from "../../../store/reducers";
import {
  bookmarkSectionNameSelector,
  bookmarksInSectionSelector,
  routeBookmarksInSectionSelector
} from "../../../store/selectors/bookmarkSectionSelectors";
import BookmarkSectionComponent from "../component/bookmarkSections/BookmarkSectionComponent";

const mapStateToProps = (state: RootState, ownProps) => {
  const id = ownProps.bookmarkSectionId;
  const bookmarksInSection = bookmarksInSectionSelector(state, id);
  const routesInSection = routeBookmarksInSectionSelector(state, id);
  const name = bookmarkSectionNameSelector(state, id);

  return {
    bookmarksInSection,
    routesInSection,
    id,
    name
  };
};

const mapDispatchToProps = dispatch => {
  return {
    removeBookmarkSection(bookmarkSectionId: number) {
      dispatch(removeBookmarkSectionRequest(bookmarkSectionId));
    },
    removeBookmarkFromSection(bookmarkSectionId: number, stopId: number) {
      dispatch(removeBookmarkFromSectionRequest(bookmarkSectionId, stopId));
    },
    removeRouteFromSection(bookmarkSectionId: number, routeId: number) {
      dispatch(
        removeRouteFromBookmarkSectionRequest(bookmarkSectionId, routeId)
      );
    },
    updateBookmarkSectionName(
      bookmarkSectionId: number,
      bookmarkSectionName: string
    ) {
      dispatch(
        updateBookmarkSectionNameRequest(bookmarkSectionId, bookmarkSectionName)
      );
    }
  };
};

const BookmarkSectionContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(BookmarkSectionComponent);

export default BookmarkSectionContainer;
