import { shallow } from "enzyme";
import React from "react";
import { StopLocation } from "../../../api/trimet/types";
import Stops from "./Stops";

describe("Stops", () => {
  describe("by default", () => {
    it("renders without crashing", () => {
      expect(() =>
        shallow(<Stops stopLocations={undefined} showArrivals={undefined} />)
      ).not.toThrow();
    });
  });

  describe("when provided stop location data", function() {
    it("shows a StopContainer for reach stop ", function() {
      const stopLocations = {
        123: {} as StopLocation,
        456: {} as StopLocation
      };

      const subject = shallow(
        <Stops stopLocations={stopLocations} showArrivals={undefined} />
      );

      const stops = subject.find(".stops-wrapper");
      expect(stops).toExist();
      expect(stops.children().length).toBe(2);
      expect(stops.childAt(0).name()).toBe("Connect(StopComponent)");
      expect(stops.childAt(1).name()).toBe("Connect(StopComponent)");
    });
  });
});
