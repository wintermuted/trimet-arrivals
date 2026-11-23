import { put } from "redux-saga/effects";
import { CHANGE_VIEW } from "../constants";

interface ChangeViewAction {
  payload: {
    activeView: string;
  };
}

export function* changeView(action: ChangeViewAction) {
  try {
    yield put({
      payload: { activeView: action.payload.activeView },
      type: CHANGE_VIEW,
    });
  } catch (e) {
    // console.error(e)
  }
}
