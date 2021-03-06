import { getNearbyStops } from "./stops";
import { StopData } from "./types";

jest.mock("./util", () => {
  return {
    getTrimetData() {
      return Promise.resolve({
        location: [{}],
        queryTime: "123"
      });
    }
  };
});

describe("getNearbyStops", () => {
  afterEach(() => {
    process.env.REACT_APP_USE_FIXTURE = undefined;
  });

  describe("when fixture data is enabled", () => {
    it("retuns fixture data for stops", done => {
      process.env.REACT_APP_USE_FIXTURE = "true";

      const location = {
        coords: {
          latitude: 123,
          longitude: 123
        }
      };

      getNearbyStops(location, 123).then((result: StopData) => {
        expect(result.queryTime).toEqual("123");
        done();
      });
    });
  });

  describe("when fixture data is not enabled", () => {
    it("fetches trimet data from stops", done => {
      const location = {
        coords: {
          latitude: 123,
          longitude: 123
        }
      };

      getNearbyStops(location, 123).then((result: StopData) => {
        expect(result.location).toEqual([{}]);
        expect(result.queryTime).toEqual("123");
        done();
      });
    });
  });
});
