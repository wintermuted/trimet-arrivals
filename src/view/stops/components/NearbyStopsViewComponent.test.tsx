import { mount, shallow } from "enzyme";
import React from "react";
import NearbyStopsViewComponent from "./NearbyStopsViewComponent";

describe("NearbyStopsViewComponent", () => {
  describe("by default", () => {
    it("renders without crashing", () => {
      expect(() =>
        shallow(
          <NearbyStopsViewComponent
            loadStopData={undefined}
            loading={undefined}
            stopLocations={undefined}
            timeOfLastLoad={undefined}
          />
        )
      ).not.toThrow();
    });
  });

  describe("when mounted", () => {
    describe("and loadStopData is provided", () => {
      it("the loadStopData delegate is called", () => {
        const loadStopData = jasmine.createSpy("loadStopDataSpy");

        const subject = shallow(
          <NearbyStopsViewComponent
            loadStopData={loadStopData}
            loading={undefined}
            stopLocations={undefined}
            timeOfLastLoad={undefined}
          />
        );

        expect(loadStopData).toHaveBeenCalled();
        expect(loadStopData).toHaveBeenCalledWith(1000);
      });
    });
  });

  describe("when loading", () => {
    it("shows a loading message", () => {
      const subject = shallow(
        <NearbyStopsViewComponent
          loadStopData={undefined}
          loading={true}
          stopLocations={undefined}
          timeOfLastLoad={undefined}
        />
      );

      expect(subject.find(".loading-message").text()).toBe("Loading...");
    });
  });

  describe("when not loading", () => {
    describe("and stop locations are provided", () => {
      const stopLocations = {
        123: {}
      };
      const subject = shallow(
        <NearbyStopsViewComponent
          loadStopData={undefined}
          loading={false}
          stopLocations={stopLocations}
          timeOfLastLoad={"12:01pm"}
        />
      );
      const nearbyStops = subject.find(".nearby-stops");

      it("shows nearby stops", () => {
        expect(nearbyStops).toExist();
      });

      describe("the nearby stops list", () => {
        it("shows Stops", () => {
          expect(nearbyStops.find("Stops")).toExist();
        });
      });
    });
  });

  describe("when the modal is opened", () => {
    const subject = mount(
      <NearbyStopsViewComponent
        loadStopData={undefined}
        loading={false}
        stopLocations={undefined}
        timeOfLastLoad={undefined}
      />
    );
    const instance = subject.instance();

    it("shows the modal", () => {
      instance.openModal({ foo: "bar" });

      // const modal = subject.find('Modal');

      expect(subject.state().modalOpen).toBe(true);
      expect(subject.state().routeInfo).toEqual({ foo: "bar" });

      // expect(modal).toExist();
    });

    it("resets the state when closed", () => {
      instance.closeModal();

      expect(subject.state().modalOpen).toBe(false);
      expect(subject.state().routeInfo).toEqual(null);

      // expect(modal).toExist();
    });
  });
});
