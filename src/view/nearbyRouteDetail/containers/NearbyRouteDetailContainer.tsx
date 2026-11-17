import { connect } from "react-redux";
import { loadRouteAlertDataRequest } from "../../../store/action/alertActions";
import { loadRouteDataRequest } from "../../../store/action/routeActions";
import { RootState } from "../../../store/reducers";
import {
  alertRequestSelector,
  alertSelector
} from "../../../store/selectors/alertSelectors";
import { routeSelector } from "../../../store/selectors/data/routeDataSelectors";
import NearbyRouteDetail from "../components/NearbyRouteDetail";

interface Props {
  id: number;
}

const mapStateToProps = (state: RootState, props: Props) => {
  const id = props.id;

  return {
    ...props,
    alerts: alertSelector(state, id),
    alertRequest: alertRequestSelector(state, id),
    route: routeSelector(state, id)
  };
};

const mapDispatchToProps = dispatch => {
  return {
    loadRouteData(id: number) {
      dispatch(loadRouteDataRequest(id));
    },
    loadAlertData(id: number) {
      dispatch(loadRouteAlertDataRequest(id));
    },
    retryAlertData(id: number) {
      dispatch(loadRouteAlertDataRequest(id));
    }
  };
};

const NearbyRouteDetailContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(NearbyRouteDetail);

export default NearbyRouteDetailContainer;
