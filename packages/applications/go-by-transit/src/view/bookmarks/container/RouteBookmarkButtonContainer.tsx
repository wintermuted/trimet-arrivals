import { connect } from "react-redux";
import {
  removeRouteBookmarkRequest,
  storeRouteBookmarkRequest
} from "../../../store/action/routeBookmarkActions";
import { RootState } from "../../../store/reducers";
import {
  routeBookmarkErrorSelector,
  routeIsBookmarkedSelector
} from "../../../store/selectors/routeBookmarkSelectors";
import RouteBookmarkButton from "../component/RouteBookmarkButton";

const mapStateToProps = (state: RootState, ownProps) => ({
  error: routeBookmarkErrorSelector(state),
  isBookmarked: routeIsBookmarkedSelector(state, ownProps.route.route)
});

const mapDispatchToProps = dispatch => ({
  onBookmark(route) {
    dispatch(storeRouteBookmarkRequest(route));
  },
  onRemove(routeId: number) {
    dispatch(removeRouteBookmarkRequest(routeId));
  }
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RouteBookmarkButton);
