import { vi } from "vitest";
import { getVehicleTrip, parseVehicleTrip } from "./vehicleTrip";
import { requestVehicleData } from "./vehicles";

const options = { baseUrl: "https://example.test/ws/", appId: "test-id" };
vi.mock("./vehicles", async () => ({
  ...(await vi.importActual<typeof import("./vehicles")>("./vehicles")), requestVehicleData: vi.fn(),
}));

const now = 1800000000000;
const stop = { locid: "101", stopSequence: 1, passengerAccessible: true, isPassed: true, status: "normal", aimedArrival: now };
const response = () => ({
  resultSet: {
    queryTime: now,
    blockStatus: [
      { blockID: "wrong", trip: [{ tripID: "target", stop: [] }] },
      { blockID: "1547", trip: [
        { tripID: "another-trip", stop: [] },
        { tripID: "target", progressFeet: 2000, destination: "Gateway TC", stop: [
          { ...stop, locid: "102", stopSequence: 2, isPassed: false, estimated: true, adjustedArrival: now + 30000 },
          stop,
        ] },
      ] },
    ],
    location: [{ id: "101", desc: "First stop" }, { id: "102", desc: "Second stop" }],
  },
});

it("matches the exact block and trip and sorts stop occurrences by sequence", () => {
  const parsed = parseVehicleTrip(response(), "1547", "target");
  expect(parsed.trip).toMatchObject({ tripId: "target", progressAvailable: true, destination: "Gateway TC" });
  expect(parsed.trip.stops).toEqual([
    expect.objectContaining({ id: "101", sequence: 1, name: "First stop", passed: true }),
    expect.objectContaining({ id: "102", sequence: 2, name: "Second stop", passed: false, estimated: now + 30000 }),
  ]);
});

it("uses the compact, verified blockStatus filter rather than the unfiltered tripStatus endpoint", async () => {
  vi.mocked(requestVehicleData).mockResolvedValue(response());
  const signal = new AbortController().signal;
  await getVehicleTrip("1547", "target", options, signal);
  const [url, actualSignal] = vi.mocked(requestVehicleData).mock.calls[0];
  expect(url.pathname).toBe("/ws/v2/blockStatus");
  expect(url.searchParams.get("blockID")).toBe("1547");
  expect(url.searchParams.get("showRoutes")).toBe("false");
  expect(url.searchParams.get("showStops")).toBe("true");
  expect(actualSignal).toBe(signal);
});

it("does not substitute a different trip when the selected run is no longer present", () => {
  expect(parseVehicleTrip(response(), "1547", "missing")).toEqual({ queryTime: now, partial: false });
  expect(() => parseVehicleTrip(response(), "missing-block", "target")).toThrow();
});

it("labels missing names, preserves repeated stop IDs, and never invents live progress", () => {
  const value = response();
  const trip = value.resultSet.blockStatus[1].trip[1];
  trip.progressFeet = null;
  trip.stop = [
    { ...stop, stopSequence: 1 },
    { ...stop, stopSequence: 3, isPassed: false },
  ];
  value.resultSet.location = [];
  const result = parseVehicleTrip(value, "1547", "target");
  expect(result.partial).toBe(true);
  expect(result.trip.progressAvailable).toBe(false);
  expect(result.trip.stops.map(entry => entry.sequence)).toEqual([1, 3]);
  expect(result.trip.stops[0].name).toContain("name unavailable");
});

it("rejects malformed, unordered-identity and service-error responses", async () => {
  expect(() => parseVehicleTrip({}, "1547", "target")).toThrow();
  const value = response();
  value.resultSet.blockStatus[1].trip[1].stop = [stop, stop];
  expect(() => parseVehicleTrip(value, "1547", "target")).toThrow("order");
  await expect(getVehicleTrip("", "target", options)).rejects.toThrow("IDs");
});
