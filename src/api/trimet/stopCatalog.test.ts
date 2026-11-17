import {
  buildStopCatalog,
  getStopCatalog,
  searchStopCatalog,
} from "./stopCatalog";
import { RouteDataResultSet, TrimetRoute } from "./interfaces/routes";
import { getAllRoutes } from "./routeConfig";

jest.mock("./routeConfig", () => ({ getAllRoutes: jest.fn() }));

function route(
  routeId: number,
  description: string,
  stops: TrimetRoute["dir"][number]["stop"],
): TrimetRoute {
  return {
    desc: description,
    dir: [{ desc: "Outbound", dir: 0, stop: stops }],
    id: routeId,
    route: routeId,
    routeColor: "000000",
    routeSortOrder: routeId,
    type: "B",
  };
}

const stop = (
  locid: number,
  desc: string,
  lat = 45,
  lng = -122,
) => ({ desc, lat, lng, locid, dir: "N", seq: 1, tp: false });

describe("stop catalog", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("deduplicates route references without merging distinct platform IDs", () => {
    const data: RouteDataResultSet = {
      route: [
        route(1, "Route 1", [stop(100, "Transit Center"), stop(101, "Transit Center")]),
        route(2, "Route 2", [stop(100, "Transit Center")]),
      ],
    };

    const catalog = buildStopCatalog(data);

    expect(catalog.stops.map(({ locid }) => locid)).toEqual([100, 101]);
    expect(catalog.stopReferenceCount).toBe(3);
    expect(searchStopCatalog(catalog.stops, " 100 ")).toHaveLength(1);
    expect(searchStopCatalog(catalog.stops, "transit center")).toHaveLength(2);
  });

  it("retains alternate names and reports missing or invalid source data", () => {
    const data: RouteDataResultSet = {
      route: [
        route(1, "Route 1", [
          stop(100, "Main St"),
          stop(100, "Main Street"),
          { ...stop(0, "Invalid stop") },
        ]),
        {
          ...route(2, "Route 2", []),
          dir: [{ desc: "Inbound", dir: 1 } as TrimetRoute["dir"][number]],
        },
      ],
    };

    const catalog = buildStopCatalog(data);

    expect(catalog.stops).toHaveLength(1);
    expect(catalog.stops[0].aliases).toEqual(["Main Street"]);
    expect(searchStopCatalog(catalog.stops, "main street")).toHaveLength(1);
    expect(catalog.incompleteDirectionCount).toBe(1);
    expect(catalog.incompleteRouteCount).toBe(0);
    expect(catalog.incompleteRouteNames).toEqual(["Route 2 (2)"]);
    expect(catalog.invalidStopCount).toBe(1);
  });

  it("rejects API errors and empty route responses", () => {
    expect(() =>
      buildStopCatalog({ route: [], errorMessage: "Service unavailable" }),
    ).toThrow("Service unavailable");
    expect(() => buildStopCatalog({ route: [] })).toThrow(
      "TriMet returned no route configuration",
    );
  });

  it("reuses the fetched catalog until an explicit refresh", async () => {
    const data = {
      route: [route(1, "Route 1", [stop(100, "Transit Center")])],
    };
    const loadRoutes = jest.mocked(getAllRoutes);
    loadRoutes.mockResolvedValue(data);

    const first = await getStopCatalog(true);
    const cached = await getStopCatalog();

    expect(loadRoutes).toHaveBeenCalledTimes(1);
    expect(cached).toBe(first);
    expect(cached.receivedAt).toBeDefined();

    await getStopCatalog(true);
    expect(loadRoutes).toHaveBeenCalledTimes(2);
  });
});
