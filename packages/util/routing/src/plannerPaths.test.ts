import { loadPlannerPaths } from ".";
import type { PlannerPathProviders } from ".";
import type { TripPlannerItinerary, TripPlannerLeg, RouteDataResultSet } from "@trimet-arrivals/trimet-client";

describe("planner geometry assembly", () => {
  const origin = { locid: 101, seq: 1, desc: "Board", lng: 0, lat: 0, dir: "E", tp: true };
  const destination = { ...origin, locid: 102, seq: 2, desc: "Exit", lng: 0.002 };
  const config: RouteDataResultSet = { route: [{
    route: 54, id: 54, desc: "Route 54", routeColor: "", type: "B", routeSortOrder: 54,
    dir: [{ dir: 1, desc: "Outbound", stop: [origin, destination] }]
  }] };
  const transit: TripPlannerLeg = {
    partial: false, mode: "Bus", route: { number: "54" },
    from: { stopId: 101, lon: 0, lat: 0 }, to: { stopId: 102, lon: 0.002, lat: 0 }
  };
  const walk: TripPlannerLeg = {
    partial: false, mode: "Walk", from: { lon: 0, lat: 0 }, to: { lon: 0.001, lat: 0 }
  };
  const trip = (legs = [transit]): TripPlannerItinerary => ({ partial: false, legs });
  let providers: PlannerPathProviders;

  beforeEach(() => {
    providers = {
      getRouteById: jest.fn().mockResolvedValue(config),
      getRouteGeometry: jest.fn().mockResolvedValue({
        type: "Feature", properties: {},
        geometry: { type: "LineString", coordinates: [[0, 0], [0.001, 0.001], [0.002, 0]] }
      }),
      getWalkingPath: jest.fn().mockResolvedValue({
        status: "ready", meters: 100, seconds: 80,
        feature: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[0, 0], [0.001, 0]] } }
      }),
      routeId: leg => Number(leg.route?.number),
      transitColor: () => "#123456"
    };
  });

  it("deduplicates injected requests while retaining trip/leg attribution and app color policy", async () => {
    const signal = new AbortController().signal;
    const { data } = await loadPlannerPaths([trip([walk, transit]), trip([walk, transit])], signal, true, providers);
    expect(data.features.map(feature => feature.properties)).toEqual([
      { trip: 0, legIndex: 0, walk: true },
      { trip: 0, legIndex: 1, walk: false, color: "#123456" },
      { trip: 1, legIndex: 0, walk: true },
      { trip: 1, legIndex: 1, walk: false, color: "#123456" }
    ]);
    expect(providers.getRouteById).toHaveBeenCalledTimes(1);
    expect(providers.getRouteGeometry).toHaveBeenCalledWith("54", 1, signal);
    expect(providers.getWalkingPath).toHaveBeenCalledTimes(1);
  });

  it("finds a connected road path through reversed, unordered, repeated segments", async () => {
    jest.mocked(providers.getRouteGeometry).mockResolvedValue({
      type: "Feature", properties: {},
      geometry: { type: "MultiLineString", coordinates: [
        [[0.002, 0], [0.001, 0.001]],
        [[0.001, 0.001], [0, 0]],
        [[0, 0], [0.001, 0.001]],
        [[1, 1], [2, 2]]
      ] }
    });
    const { data } = await loadPlannerPaths([trip()], new AbortController().signal, false, providers);
    expect(data.features[0].geometry).toEqual({
      type: "LineString", coordinates: [[0, 0], [0.001, 0.001], [0.002, 0]]
    });
  });

  it("does not bridge disconnected shapes or show ambiguous directions", async () => {
    jest.mocked(providers.getRouteGeometry).mockResolvedValue({
      type: "Feature", properties: {},
      geometry: { type: "MultiLineString", coordinates: [
        [[0, 0], [0, 0.001]], [[0.002, 0.001], [0.002, 0]]
      ] }
    });
    const signal = new AbortController().signal;
    expect((await loadPlannerPaths([trip()], signal, false, providers)).data.features).toEqual([]);
    jest.mocked(providers.getRouteById).mockResolvedValue({
      route: [{ ...config.route[0], dir: [config.route[0].dir[0], config.route[0].dir[0]] }]
    });
    jest.mocked(providers.getRouteGeometry).mockClear();
    expect((await loadPlannerPaths([trip()], signal, false, providers)).data.features).toEqual([]);
    expect(providers.getRouteGeometry).not.toHaveBeenCalled();
  });

  it("retains usable transit legs when walking routing fails and never requests walks without opt-in", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      jest.mocked(providers.getWalkingPath).mockRejectedValue(new Error("Walking unavailable"));
      const signal = new AbortController().signal;
      const result = await loadPlannerPaths([trip([walk, transit])], signal, true, providers);
      expect(result.data.features).toHaveLength(1);
      expect(result.data.features[0].properties.legIndex).toBe(1);
      expect(warning).toHaveBeenCalledWith(expect.stringContaining("walking geometry"), expect.any(Error));
      jest.mocked(providers.getWalkingPath).mockClear();
      await loadPlannerPaths([trip([walk, transit])], signal, false, providers);
      expect(providers.getWalkingPath).not.toHaveBeenCalled();
    } finally {
      warning.mockRestore();
    }
  });

  it("discards cancelled route work before fetching geometry", async () => {
    const controller = new AbortController();
    jest.mocked(providers.getRouteById).mockImplementation(async () => {
      controller.abort();
      return config;
    });
    const { data } = await loadPlannerPaths([trip()], controller.signal, false, providers);
    expect(data.features).toEqual([]);
    expect(providers.getRouteGeometry).not.toHaveBeenCalled();
  });
});
