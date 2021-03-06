import { connect } from "react-redux";
import { loadStopDataRequest } from "../../../store/action/stopActions";
import { RootState } from "../../../store/reducers";
import {
  allStopLocationsSelector,
  stopsLoadingSelector
} from "../../../store/selectors/stopSelectors";
import NearbyStopsViewComponent from "../components/NearbyStopsViewComponent";

const mapStateToProps = (state: RootState) => {
  return {
    loading: stopsLoadingSelector(state),
    stopLocations: allStopLocationsSelector(state)
  };
};

const mapDispatchToProps = dispatch => {
  return {
    loadStopData(radiusInFeet: number): void {
      dispatch(loadStopDataRequest(radiusInFeet));
    }
  };
};

const NearbyStopsViewContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(NearbyStopsViewComponent);

export default NearbyStopsViewContainer;
