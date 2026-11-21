import { createSelector } from "reselect";
import { Alert } from "../../api/trimet/interfaces/alertsData";
import { AlertRequestState } from "../reducers/data/alertDataReducer";
import { RootState } from "../reducers";

const alertsById = (state: RootState, id: number) =>
  state.alertDataReducer.routeAlerts[id];

export const alertSelector = createSelector(
  alertsById,
  (routeAlerts: Alert[]) => routeAlerts
);

export const alertRequestSelector = (
  state: RootState,
  id: number
): AlertRequestState => state.alertDataReducer.routeAlertRequests[id] || {
  loading: false,
  error: false,
  loaded: false
};
