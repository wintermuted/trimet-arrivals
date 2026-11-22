import { vi } from "vitest";
import {
  getAlertsByLocationId,
  getAlertsByRouteId,
  getAllRoutes,
  getArrivals,
  getNearbyStops,
  getRouteById,
  getRouteByIdAndDirection,
  getSubsequentRouteStops,
  getSystemAlerts
} from "./index";
import { arrival1 } from "./fixture/arrival";

const options = { baseUrl: "https://example.test/ws/", appId: "test-id" };
const location = { coords: { latitude: 45.52, longitude: -122.68 } };
const fetchMock = vi.fn();
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

it.each([
  ["all routes", () => getAllRoutes(options), "dir/true/stops/true"],
  ["one direction", () => getRouteByIdAndDirection(54, 0, options), "route/54/dir/0/stops/true"],
  ["subsequent stops", () => getSubsequentRouteStops(54, 0, 123, options), "route/54/dir/0/stops/true/startSeq/123"]
] as const)("requests route configuration for %s", async (scope, request, path) => {
  const resultSet = { route: [] };
  fetchMock.mockResolvedValue({ json: async () => ({ resultSet }) });

  await expect(request()).resolves.toEqual(resultSet);
  expect(fetchMock).toHaveBeenCalledWith(
    `https://example.test/ws/V1/routeConfig/json/true/${path}/appID/test-id`,
    undefined
  );
});

it("uses fixtures only for all routes and forwards the signal for a single route", async () => {
  const fixtureOptions = { ...options, useFixtures: true };
  const { signal } = new AbortController();
  const resultSet = { route: [] };
  fetchMock.mockResolvedValue({ json: async () => ({ resultSet }) });

  const fixture = await getAllRoutes(fixtureOptions);
  expect(fixture.route.map(route => route.route)).toEqual([
    1, 2, 3, 3, 100, 90, 200, 190, 290, 193, 195, 194
  ]);
  expect(fetchMock).not.toHaveBeenCalled();

  await expect(getRouteById(54, fixtureOptions, signal)).resolves.toEqual(resultSet);
  expect(fetchMock).toHaveBeenCalledWith(
    "https://example.test/ws/V1/routeConfig/json/true/route/54/dir/true/stops/true/appID/test-id",
    { signal }
  );
});

it.each([
  ["system", () => getSystemAlerts(options), ""],
  ["route", () => getAlertsByRouteId(54, options), "route/54/"],
  ["stop", () => getAlertsByLocationId(123, options), "locIDs/123/"]
] as const)("requests %s alerts and returns the TriMet result set", async (scope, request, path) => {
  const resultSet = { alert: [], queryTime: "123" };
  fetchMock.mockResolvedValue({ json: async () => ({ resultSet }) });

  await expect(request()).resolves.toEqual(resultSet);
  expect(fetchMock).toHaveBeenCalledWith(
    `https://example.test/ws/v2/alerts/json/true/${path}appID/test-id`,
    undefined
  );
});
