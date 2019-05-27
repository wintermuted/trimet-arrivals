// tslint:disable:no-submodule-imports
import { call, put } from "redux-saga/effects";
// tslint:enable:no-submodule-imports
import { getCurrentPosition } from "../../api/geolocation";
import { getNearbyStops } from "../../api/trimet/stops";
import {
  CURRENT_LOCATION_LOAD_COMPLETE,
  LOAD_STOP_COMPLETE,
  LOAD_STOPS
} from "../constants";

export function* loadStopData(action) {
  const radiusInFeet = action.payload.radiusInFeet;

  try {
    yield put({ type: LOAD_STOPS });
    const location = yield call(getCurrentPosition);
    yield put({ payload: { location }, type: CURRENT_LOCATION_LOAD_COMPLETE });
    const stopData = yield call(getNearbyStops, location, radiusInFeet);
    yield put({ payload: { stopData }, type: LOAD_STOP_COMPLETE });
  } catch (e) {
    // console.error(e);
  }
}
