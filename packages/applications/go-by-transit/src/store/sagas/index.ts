import { takeEvery } from "redux-saga/effects";
import { LOAD_ARRIVALS_DATA_REQUEST } from "../constants";
import { loadArrivalData } from "./arrivalSagas";

export function* rootSaga() {
  yield takeEvery(LOAD_ARRIVALS_DATA_REQUEST, loadArrivalData);
}
