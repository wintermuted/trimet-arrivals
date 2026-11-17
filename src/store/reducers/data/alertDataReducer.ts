import { Alert, AlertsData } from "../../../api/trimet/interfaces/alertsData";
import {
  LOAD_ROUTE_ALERTS_COMPLETE,
  LOAD_ROUTE_ALERTS_ERROR,
  LOAD_ROUTES_ALERT_DATA
} from "../../constants";

export interface AlertRequestState {
  loading: boolean;
  error: boolean;
  loaded: boolean;
}

export interface AlertDataReducerState {
  routeAlerts: {
    [id: string]: Alert[];
  };
  routeAlertRequests: {
    [id: string]: AlertRequestState;
  };
}

const initialState: AlertDataReducerState = {
  routeAlerts: {},
  routeAlertRequests: {}
};

interface Payload {
  alertData?: AlertsData;
  id: number;
}

interface Action {
  payload?: Payload;
  type: string;
}

function updateRouteAlertsState(
  action: Action,
  state: AlertDataReducerState
): AlertDataReducerState {
  const { id, alertData } = action.payload!;
  const alerts = alertData!.alert;

  return {
    ...state,
    routeAlerts: {
      ...state.routeAlerts,
      [id]: alerts
    },
    routeAlertRequests: {
      ...state.routeAlertRequests,
      [id]: { loading: false, error: false, loaded: true }
    }
  };
}

function updateRouteAlertRequest(
  action: Action,
  state: AlertDataReducerState,
  requestState: AlertRequestState
): AlertDataReducerState {
  const id = action.payload!.id;
  return {
    ...state,
    routeAlertRequests: {
      ...state.routeAlertRequests,
      [id]: requestState
    }
  };
}

const alertDataReducer = (
  state: AlertDataReducerState = initialState,
  action: Action
): AlertDataReducerState => {
  switch (action.type) {
    case LOAD_ROUTES_ALERT_DATA:
      return updateRouteAlertRequest(action, state, {
        loading: true,
        error: false,
        loaded: !!state.routeAlerts[action.payload!.id]
      });
    case LOAD_ROUTE_ALERTS_COMPLETE:
      return updateRouteAlertsState(action, state);
    case LOAD_ROUTE_ALERTS_ERROR:
      return updateRouteAlertRequest(action, state, {
        loading: false,
        error: true,
        loaded: !!state.routeAlerts[action.payload!.id]
      });
    default:
      return state;
  }
};

export default alertDataReducer;
