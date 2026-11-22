import { connect } from "react-redux";
import {
  addRouteToBookmarkSectionRequest,
  removeRouteFromBookmarkSectionRequest
} from "../../../store/action/bookmarkSectionActions";
import { RootState } from "../../../store/reducers";
import { routeBookmarksInSectionSelector } from "../../../store/selectors/bookmarkSectionSelectors";
import { routeBookmarksSelector } from "../../../store/selectors/routeBookmarkSelectors";
import RouteBookmarksInSectionSelectionHandler from "../component/bookmarkSections/sectionSelector/RouteBookmarksInSectionSelectionHandler";

const mapStateToProps = (state: RootState, ownProps) => ({
  allRoutes: Object.values(routeBookmarksSelector(state)),
  routesInSection: routeBookmarksInSectionSelector(
    state,
    ownProps.bookmarkSectionId
  )
});

const mapDispatchToProps = dispatch => ({
  addRouteToBookmarkSection(bookmarkSectionId: number, routeId: number) {
    dispatch(addRouteToBookmarkSectionRequest(bookmarkSectionId, routeId));
  },
  removeRouteFromBookmarkSection(bookmarkSectionId: number, routeId: number) {
    dispatch(removeRouteFromBookmarkSectionRequest(bookmarkSectionId, routeId));
  }
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RouteBookmarksInSectionSelectionHandler);
