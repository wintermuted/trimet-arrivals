import { put } from "redux-saga/effects";
import { CHANGE_VIEW } from "../constants";
import { changeView } from "./viewSagas";

describe("viewSagas", () => {
  describe("showStops", () => {
    const changeViewData = changeView({
      payload: { activeView: "foo" },
    });

    it("dispatches the load arrivals event", () => {
      expect(changeViewData.next().value).toEqual(
        put({
          payload: {
            activeView: "foo",
          },
          type: CHANGE_VIEW,
        }),
      );
    });
  });
});
