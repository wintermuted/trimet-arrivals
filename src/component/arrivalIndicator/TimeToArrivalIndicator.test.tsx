import { shallow } from "enzyme";
import moment from "moment";
import React from "react";
import TimeToArrivalIndicator from "./TimeToArrivalIndicator";

describe("TimeToArrivalIndicator", () => {
  describe("by default", () => {
    it("renders without crashing", () => {
      expect(() =>
        shallow(
          <TimeToArrivalIndicator estimated={undefined} now={undefined} />
        )
      ).not.toThrow();
    });

    it("returns a dash", () => {
      const subject = shallow(
        <TimeToArrivalIndicator estimated={undefined} now={undefined} />
      );

      expect(subject.text()).toBe("-");
    });
  });

  describe("when the difference is less than a minute", () => {
    it("shows the date in second format", () => {
      const estimated = moment(8000);
      const subject = shallow(
        <TimeToArrivalIndicator estimated={estimated} now={moment(1000)} />
      );

      expect(subject.text()).toBe("7s");
    });
  });

  describe("when the difference is more than a minute", () => {
    it("shows the date in second format", () => {
      const estimated = moment(100000);
      const subject = shallow(
        <TimeToArrivalIndicator estimated={estimated} now={moment(1000)} />
      );

      expect(subject.text()).toBe("1m 39s");
    });
  });
});
