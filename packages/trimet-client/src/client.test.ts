import { getArrivals, getNearbyStops } from "./index";
import { arrival1 } from "./fixture/arrival";

const options = { baseUrl: "https://example.test/ws/", appId: "test-id" };
const location = { coords: { latitude: 45.52, longitude: -122.68 } };
const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = fetchMock;
  fetchMock.mockRejectedValue(new Error("Unexpected request"));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

it("requests arrivals for multiple stops and returns the TriMet result set", async () => {
  const resultSet = { arrival: [arrival1], location: [], queryTime: "123" };
  fetchMock.mockResolvedValue({ json: async () => ({ resultSet }) });

  await expect(getArrivals("123,456", 30, options)).resolves.toEqual(resultSet);
  expect(fetchMock).toHaveBeenCalledWith(
    "https://example.test/ws/V2/arrivals/json/true/locIDs/123,456/arrivals/4/showPosition/true/minutes/30/appID/test-id",
    undefined
  );
});

it("requests nearby stops using latitude, longitude and a radius in feet", async () => {
  const resultSet = { location: [], queryTime: "123" };
  fetchMock.mockResolvedValue({ json: async () => ({ resultSet }) });

  await expect(getNearbyStops(location, 800, options)).resolves.toEqual(resultSet);
  expect(fetchMock).toHaveBeenCalledWith(
    "https://example.test/ws/V1/stops/json/true/showRoutes/true/showRouteDirs/true/ll/45.52,-122.68/feet/800/appID/test-id",
    undefined
  );
});

it("returns the existing fixtures without making a network request", async () => {
  const fixtureOptions = { ...options, useFixtures: true };

  const [arrivals, stops] = await Promise.all([
    getArrivals("123", 30, fixtureOptions),
    getNearbyStops(location, 800, fixtureOptions)
  ]);

  expect(arrivals.arrival).toContainEqual(arrival1);
  expect(stops.location.length).toBeGreaterThan(0);
  expect(fetchMock).not.toHaveBeenCalled();
});
