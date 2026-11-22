import { Alert } from "../../../api/trimet/interfaces/alertsData";
import {
  LOAD_ROUTE_ALERTS_COMPLETE,
  LOAD_ROUTE_ALERTS_ERROR,
  LOAD_ROUTES_ALERT_DATA
} from "../../constants";
import alertDataReducer from "./alertDataReducer";

const alert = (id: number): Alert => ({
  id,
  begin: 1,
  end: 0,
  desc: `Alert ${id}`,
  header_text: `Alert ${id}`,
  info_link_url: "",
  system_wide_flag: false,
  route: []
});

describe("alertDataReducer", () => {
  it("tracks route request states and keeps alerts from other routes", () => {
    let state = alertDataReducer(undefined, { type: "init" });
    state = alertDataReducer(state, {
      type: LOAD_ROUTES_ALERT_DATA,
      payload: { id: 54 }
    });
    expect(state.routeAlertRequests[54]).toEqual({
      loading: true,
      error: false,
      loaded: false
    });

    state = alertDataReducer(state, {
      type: LOAD_ROUTE_ALERTS_COMPLETE,
      payload: { id: 54, alertData: { alert: [alert(1)], queryTime: "1" } }
    });
    state = alertDataReducer(state, {
      type: LOAD_ROUTE_ALERTS_COMPLETE,
      payload: { id: 8, alertData: { alert: [alert(2)], queryTime: "2" } }
    });
    expect(state.routeAlerts[54].map(item => item.id)).toEqual([1]);
    expect(state.routeAlerts[8].map(item => item.id)).toEqual([2]);
    expect(state.routeAlertRequests[54].loaded).toBe(true);
  });

  it("retains the last good route alerts after a refresh fails", () => {
    let state = alertDataReducer(undefined, {
      type: LOAD_ROUTE_ALERTS_COMPLETE,
      payload: { id: 54, alertData: { alert: [alert(1)], queryTime: "1" } }
    });
    state = alertDataReducer(state, {
      type: LOAD_ROUTES_ALERT_DATA,
      payload: { id: 54 }
    });
    state = alertDataReducer(state, {
      type: LOAD_ROUTE_ALERTS_ERROR,
      payload: { id: 54 }
    });
    expect(state.routeAlerts[54].map(item => item.id)).toEqual([1]);
    expect(state.routeAlertRequests[54]).toEqual({
      loading: false,
      error: true,
      loaded: true
    });
  });
});
