/** @jest-environment jsdom */
import { getVehicles, parseVehicleSnapshot } from "./index";

const options = { baseUrl: "https://example.test/ws/", appId: "test-id" };

const now = 1800000000000;
const bus = { vehicleID: 1, type: "bus", longitude: -122.68, latitude: 45.51, time: now, expires: now + 60000 };
const bounds: [number, number, number, number] = [-123, 45, -122, 46];
const originalFetch = global.fetch;

afterEach(() => { global.fetch = originalFetch; });

it("requests a viewport snapshot with an abort signal, not arrival parameters", async () => {
  const signal = new AbortController().signal;
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true, json: async () => ({ resultSet: { queryTime: now, vehicle: [bus] } }),
  });
  global.fetch = fetchMock;
  expect((await getVehicles(bounds, options, signal)).vehicles[0].id).toBe("1");
  const url = new URL(fetchMock.mock.calls[0][0]);
  expect(url.pathname).toBe("/ws/v2/vehicles");
  expect(url.searchParams.get("bbox")).toBe(bounds.join(","));
  expect(url.searchParams.get("appID")).toBe(options.appId);
  expect(url.searchParams.get("onRouteOnly")).toBe("true");
  expect(url.searchParams.get("showNonRevenue")).toBe("false");
  expect(url.searchParams.get("showStale")).toBe("false");
  expect(url.searchParams.has("locIDs")).toBe(false);
  expect(fetchMock.mock.calls[0][1].signal).toBe(signal);
});

it("normalizes bus/rail identities, keeps newer duplicates, and reports rejected entries", () => {
  const result = parseVehicleSnapshot({ resultSet: { queryTime: now, vehicle: [
    { ...bus, time: now - 1000, longitude: -122.7 },
    { ...bus, bearing: 90, routeNumber: 15, direction: 1, tripID: "18314612", routeColor: "123abc", signMessageLong: "Example bus" },
    { ...bus, vehicleID: "rail-1", type: "rail", bearing: -1, routeColor: "javascript:bad" },
    { ...bus, vehicleID: "bad-coordinate", longitude: Infinity },
    { ...bus, vehicleID: "bad-mode", type: "plane" },
    { ...bus, vehicleID: "future", time: now + 60000 },
  ] } });
  expect(result.rejected).toBe(3);
  expect(result.vehicles).toHaveLength(2);
  expect(result.vehicles[0]).toMatchObject({ id: "1", longitude: -122.68, bearing: 90, color: "#123abc", destination: "Example bus", direction: 1, tripId: "18314612" });
  expect(result.vehicles[1]).toMatchObject({ id: "rail-1", type: "rail", bearing: undefined, color: undefined });
  expect(parseVehicleSnapshot({ resultSet: { queryTime: now, vehicle: [{ ...bus, routeColor: "#C41F3E" }] } }).vehicles[0].color).toBe("#C41F3E");
});

it("distinguishes an empty snapshot from malformed and service-error responses", () => {
  expect(parseVehicleSnapshot({ resultSet: { queryTime: now, vehicle: [] } }).vehicles).toEqual([]);
  expect(parseVehicleSnapshot({ resultSet: { queryTime: now } }).vehicles).toEqual([]);
  for (const response of [{}, { resultSet: {} }, { resultSet: { queryTime: now, vehicle: {} } },
    { resultSet: { queryTime: now, vehicle: [], error: { content: "Failure" } } }]) {
    expect(() => parseVehicleSnapshot(response)).toThrow();
  }
});

it.each([429, 503, 401])("surfaces HTTP %s and preserves throttling/permanent failure information", async status => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false, status, headers: { get: () => "45" },
  });
  await expect(getVehicles(bounds, options)).rejects.toMatchObject({
    permanent: status === 401, retryAfterMs: 45000,
  });
});

it("does not fetch invalid bounds or an already aborted request", async () => {
  global.fetch = jest.fn();
  await expect(getVehicles([-122, 46, -123, 45], options)).rejects.toThrow("bounds");
  const controller = new AbortController();
  controller.abort();
  await expect(getVehicles(bounds, options, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  expect(global.fetch).not.toHaveBeenCalled();
});

it("looks up a followed vehicle by identity without viewport restrictions", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true, json: async () => ({ resultSet: { queryTime: now, vehicle: [bus] } }),
  });
  await getVehicles(undefined, options, undefined, "1");
  const url = new URL(jest.mocked(global.fetch).mock.calls[0][0].toString());
  expect(url.searchParams.get("ids")).toBe("1");
  expect(url.searchParams.has("bbox")).toBe(false);
});
