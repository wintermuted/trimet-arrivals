import { getRouteGeometry } from ".";

describe("route geometry loading", () => {
  const originalFetch = global.fetch;
  const line = { type: "LineString", coordinates: [[-122.7, 45.5], [-122.6, 45.6]] };
  const feature = { type: "Feature", properties: { route_number: "54" }, geometry: line };

  afterEach(() => { global.fetch = originalFetch; });

  it.each(["", "/overworld", "/pr-123/"])(
    "loads geometry from the supplied asset base %s and forwards cancellation",
    async baseUrl => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => feature });
      const signal = new AbortController().signal;
      await expect(getRouteGeometry("54", 1, { baseUrl, signal })).resolves.toEqual(feature);
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl.replace(/\/+$/, "")}/data/trimet/geoJSON/54/54_1.json`,
        { signal }
      );
    }
  );

  it("normalizes nested line collections without joining disconnected segments", async () => {
    const other = [[-122.5, 45.7], [-122.4, 45.8]];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ...feature,
        geometry: {
          type: "GeometryCollection",
          geometries: [
            line,
            { type: "GeometryCollection", geometries: [{ type: "MultiLineString", coordinates: [other] }] }
          ]
        }
      })
    });
    await expect(getRouteGeometry("54", 1, { baseUrl: "" })).resolves.toEqual({
      ...feature,
      geometry: { type: "MultiLineString", coordinates: [line.coordinates, other] }
    });
  });

  it("preserves multiline assets", async () => {
    const multiline = { ...feature, geometry: { type: "MultiLineString", coordinates: [line.coordinates] } };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => multiline });
    await expect(getRouteGeometry("54", 1, { baseUrl: "" })).resolves.toEqual(multiline);
  });

  it.each([
    [null, "Invalid route geometry"],
    [{ type: "LineString", coordinates: [] }, "Invalid route geometry"],
    [{ type: "GeometryCollection", geometries: [] }, "Empty route geometry"],
    [{ type: "GeometryCollection", geometries: [{ type: "Point", coordinates: [0, 0] }] }, "Unsupported route geometry"]
  ])("rejects unusable geometry", async (geometry, message) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ...feature, geometry }) });
    await expect(getRouteGeometry("54", 1, { baseUrl: "" })).rejects.toThrow(String(message));
  });

  it("reports HTTP failures and propagates cancellation", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" });
    await expect(getRouteGeometry("54", 1, { baseUrl: "" }))
      .rejects.toThrow("Unable to load route geometry 54/54_1.json: 404 Not Found");
    const aborted = new DOMException("Aborted", "AbortError");
    global.fetch = jest.fn().mockRejectedValue(aborted);
    await expect(getRouteGeometry("54", 1, { baseUrl: "" })).rejects.toBe(aborted);
  });
});
