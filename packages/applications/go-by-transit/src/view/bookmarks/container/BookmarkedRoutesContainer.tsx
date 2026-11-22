import { connect } from "react-redux";
import { removeRouteBookmarkRequest } from "../../../store/action/routeBookmarkActions";
import { RootState } from "../../../store/reducers";
import { routeBookmarksSelector } from "../../../store/selectors/routeBookmarkSelectors";
import BookmarkedRoutes from "../component/BookmarkedRoutes";

const mapStateToProps = (state: RootState) => ({
  routes: Object.values(routeBookmarksSelector(state))
});

const mapDispatchToProps = dispatch => ({
  onRemove(routeId: number) {
    dispatch(removeRouteBookmarkRequest(routeId));
  }
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(BookmarkedRoutes);
