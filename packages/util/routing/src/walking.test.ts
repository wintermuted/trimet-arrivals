import { vi } from "vitest";
import {
  clearWalkingCache,
  getWalkingEstimates,
  getWalkingRoute,
  setWalkingAccessToken,
} from "@overworld/routing";
import type { WalkingStop } from "@overworld/routing";

const origin = [0, 0];
const stops: WalkingStop[] = [
  { lat: 0.001, lng: 0, locid: 340 },
  { lat: 0.002, lng: 0, locid: 367 },
];
const waypoint = (point: number[]) => ({ distance: 0, location: point });
const matrix = (destinations = stops) => ({
  code: "Ok",
  destinations: destinations.map((stop) => waypoint([stop.lng, stop.lat])),
  distances: [destinations.map((_, index) => 500 - (index % 3) * 100)],
  durations: [destinations.map((_, index) => 400 - (index % 3) * 100)],
  sources: [waypoint(origin)],
});
const directions = () => ({
  code: "Ok",
  routes: [
    {
      distance: 500,
      duration: 400,
      geometry: {
        coordinates: [origin, [0.001, 0], [0.001, 0.001]],
        type: "LineString",
      },
    },
  ],
  waypoints: [waypoint(origin), waypoint([0.001, 0.001])],
});
const response = (data: object) => ({
  json: async () => data,
  ok: true,
  status: 200,
});

describe("Mapbox walking routing", () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    setWalkingAccessToken("pk.synthetic-test-token");
    global.fetch = vi.fn().mockResolvedValue(response(matrix()));
  });
  afterEach(() => {
    global.fetch = originalFetch;
    clearWalkingCache();
    vi.restoreAllMocks();
  });

  it("requests one-to-many walking distance and time without straight-line substitution, deduplicating stop IDs", async () => {
    const result = await getWalkingEstimates(
      origin,
      [stops[0], ...stops],
      new AbortController().signal
    );
    const url = new URL(vi.mocked(global.fetch).mock.calls[0][0].toString());
    expect(url.pathname).toContain("/directions-matrix/v1/mapbox/walking/");
    expect(url.searchParams.get("sources")).toBe("0");
    expect(url.searchParams.get("destinations")).toBe("1;2");
    expect(url.searchParams.get("annotations")).toBe("distance,duration");
    expect(url.searchParams.has("fallback_speed")).toBe(false);
    expect(result.get(340)).toEqual({
      meters: 500,
      seconds: 400,
      status: "ready",
    });
    expect(result.get(367)).toEqual({
      meters: 400,
      seconds: 300,
      status: "ready",
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("splits 25 destinations into a 24-stop matrix and a single-stop Directions request", async () => {
    const many = Array.from({ length: 25 }, (_, index) => ({
      lat: index / 1000,
      lng: 0,
      locid: index + 1,
    }));
    vi
      .mocked(global.fetch)
      .mockResolvedValueOnce(response(matrix(many.slice(0, 24))))
      .mockResolvedValueOnce(response(directions()));
    const result = await getWalkingEstimates(
      origin,
      many,
      new AbortController().signal
    );
    expect(result.size).toBe(25);
    const urls = vi
      .mocked(global.fetch)
      .mock.calls.map(([url]) => new URL(url.toString()));
    expect(urls[0].pathname.split("/").pop().split(";")).toHaveLength(25);
    expect(urls[1].pathname).toContain("/directions/v5/mapbox/walking/");
    expect(urls[1].searchParams.get("geometries")).toBe("geojson");
  });

  it("caches briefly by origin and stop coordinates and invalidates on token changes", async () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(1000);
    await getWalkingEstimates(origin, stops, new AbortController().signal);
    await getWalkingEstimates(
      origin,
      [...stops].reverse(),
      new AbortController().signal
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
    clock.mockReturnValue(62000);
    await getWalkingEstimates(origin, stops, new AbortController().signal);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    await getWalkingEstimates([0.001, 0], stops, new AbortController().signal);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    setWalkingAccessToken("pk.replacement-test-token");
    await getWalkingEstimates(origin, stops, new AbortController().signal);
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it("keeps unreachable and suspiciously snapped stops separate from usable estimates", async () => {
    const data = matrix();
    data.distances[0][0] = null;
    data.durations[0][0] = null;
    data.destinations[1].distance = 100;
    vi.mocked(global.fetch).mockResolvedValue(response(data));
    const result = await getWalkingEstimates(
      origin,
      stops,
      new AbortController().signal
    );
    expect(result.get(340)).toEqual({ status: "unreachable" });
    expect(result.get(367)).toEqual({ status: "uncertain" });
  });

  it.each(["NoRoute", "NoSegment"])(
    "handles %s without inventing a walking distance",
    async (code) => {
      vi.mocked(global.fetch).mockResolvedValue(response({ code }));
      const result = await getWalkingEstimates(
        origin,
        stops,
        new AbortController().signal
      );
      expect(Array.from(result.values())).toEqual([
        { status: code === "NoRoute" ? "unreachable" : "uncertain" },
        { status: code === "NoRoute" ? "unreachable" : "uncertain" },
      ]);
    }
  );

  it.each([403, 429])(
    "surfaces HTTP %s without automatic retry loops",
    async (status) => {
      vi.mocked(global.fetch).mockResolvedValue({ ok: false, status });
      await expect(
        getWalkingEstimates(origin, stops, new AbortController().signal)
      ).rejects.toThrow(status === 429 ? "limit reached" : "routing access");
      expect(global.fetch).toHaveBeenCalledTimes(1);
    }
  );

  it("rejects malformed or negative results instead of caching them as success", async () => {
    const data = matrix();
    data.distances[0][0] = -1;
    vi
      .mocked(global.fetch)
      .mockResolvedValueOnce(response(data))
      .mockResolvedValueOnce(response(matrix()));
    await expect(
      getWalkingEstimates(origin, stops, new AbortController().signal)
    ).rejects.toThrow("invalid walking");
    expect(
      (
        await getWalkingEstimates(origin, stops, new AbortController().signal)
      ).get(340).status
    ).toBe("ready");
  });

  it("aborts pending batches and does not cache late results", async () => {
    let resolveFetch: (value: object) => void;
    vi.mocked(global.fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );
    const control = new AbortController();
    const pending = getWalkingEstimates(origin, stops, control.signal);
    control.abort();
    resolveFetch(response(matrix()));
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await getWalkingEstimates(origin, stops, new AbortController().signal);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not fetch with invalid locations, missing configuration or an already aborted request", async () => {
    await expect(
      getWalkingEstimates([NaN, 0], stops, new AbortController().signal)
    ).rejects.toThrow("valid");
    const control = new AbortController();
    control.abort();
    await expect(
      getWalkingEstimates(origin, stops, control.signal)
    ).rejects.toMatchObject({ name: "AbortError" });
    setWalkingAccessToken("");
    await expect(
      getWalkingEstimates(origin, stops, new AbortController().signal)
    ).rejects.toThrow("not configured");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns validated walking geometry and refuses distant snapping", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(response(directions()));
    const result = await getWalkingRoute(
      origin,
      stops[0],
      new AbortController().signal
    );
    expect(result).toEqual(
      expect.objectContaining({
        feature: {
          geometry: directions().routes[0].geometry,
          properties: {},
          type: "Feature",
        },
        meters: 500,
        seconds: 400,
        status: "ready",
      })
    );
    clearWalkingCache();
    const data = directions();
    data.waypoints[0].distance = 51;
    vi.mocked(global.fetch).mockResolvedValueOnce(response(data));
    expect(
      await getWalkingRoute(origin, stops[0], new AbortController().signal)
    ).toEqual({ status: "uncertain" });
  });

  it("sanitizes transport errors instead of exposing request URLs", async () => {
    vi
      .mocked(global.fetch)
      .mockRejectedValue(
        new Error("Request failed: https://example.invalid/private-coordinate")
      );
    await expect(
      getWalkingEstimates(origin, stops, new AbortController().signal)
    ).rejects.toThrow("Check your connection");
  });
});
