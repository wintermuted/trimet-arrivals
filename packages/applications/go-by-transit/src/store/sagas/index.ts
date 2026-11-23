import { takeEvery } from "redux-saga/effects";
import {
  CHANGE_VIEW_REQUEST,
  LOAD_ALL_ROUTES_DATA_REQUEST,
  LOAD_ARRIVALS_DATA_REQUEST,
  LOAD_ROUTE_ALERT_DATA_REQUEST,
  LOAD_ROUTE_DATA_REQUEST,
  LOAD_STOP_DATA_REQUEST,
  UPDATE_VIEW_REQUEST,
} from "../constants";
import { loadRouteAlertData } from "./alertSagas";
import { loadArrivalData } from "./arrivalSagas";
import { loadAllRouteData, loadRouteDataById } from "./routeSagas";
import { loadStopData, updateNearbyActiveView } from "./stopSagas";
import { changeView } from "./viewSagas";

export function* rootSaga() {
  // @ts-ignore
  yield takeEvery(LOAD_STOP_DATA_REQUEST, loadStopData);
  yield takeEvery(LOAD_ARRIVALS_DATA_REQUEST, loadArrivalData);
  // @ts-ignore
  yield takeEvery(CHANGE_VIEW_REQUEST, changeView);
  // @ts-ignore
  yield takeEvery(UPDATE_VIEW_REQUEST, updateNearbyActiveView);
  // @ts-ignore
  yield takeEvery(LOAD_ROUTE_DATA_REQUEST, loadRouteDataById);
  // @ts-ignore
  yield takeEvery(LOAD_ROUTE_ALERT_DATA_REQUEST, loadRouteAlertData);
  yield takeEvery(LOAD_ALL_ROUTES_DATA_REQUEST, loadAllRouteData);
}
