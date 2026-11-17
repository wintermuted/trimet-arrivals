import { call, put } from "redux-saga/effects";
import { getAlertsByRouteId } from "../../api/trimet/alerts";
import {
  LOAD_ROUTE_ALERTS_ERROR,
  LOAD_ROUTES_ALERT_DATA
} from "../constants";
import { loadRouteAlertData } from "./alertSagas";

describe("loadRouteAlertData", () => {
  it("surfaces API failures as a route alert error state", () => {
    const saga = loadRouteAlertData({ payload: { id: 54 } });
    expect(saga.next().value).toEqual(
      put({ type: LOAD_ROUTES_ALERT_DATA, payload: { id: 54 } })
    );
    expect(saga.next().value).toEqual(call(getAlertsByRouteId, 54));
    expect(saga.throw(new Error("network unavailable")).value).toEqual(
      put({ type: LOAD_ROUTE_ALERTS_ERROR, payload: { id: 54 } })
    );
  });
});
