import { readFileSync } from "fs";
import path from "path";
import { Feature, Geometry, LineString, Position } from "geojson";
import { getSelectedRouteSegment } from "../view/nearby/util/mapbox/routeSegment";
import { RouteDirectionStop } from "../api/trimet/interfaces/routes";
import route54 from "../../public/data/trimet/geoJSON/54/54_1.json";

const { mergeRouteFeatures } = require("../../scripts/split_routes");

function feature(coordinates: number[][], route = "54", direction = "1") {
  return {
    type: "Feature",
    properties: { route_number: route, direction },
    geometry: { type: "LineString", coordinates }
  };
}

function roadEdges(geometry: Geometry): string[] {
  function lines(part: Geometry): Position[][] {
    if (part.type === "GeometryCollection") {
      return part.geometries.flatMap(lines);
    }
    if (part.type === "LineString") {
      return [part.coordinates];
    }
    if (part.type === "MultiLineString") {
      return part.coordinates;
    }
    throw new Error(`Unexpected geometry: ${part.type}`);
  }
  return lines(geometry).flatMap(line => line.slice(1).map((point, index) =>
    [line[index], point].map(p => JSON.stringify(p.slice(0, 2))).sort().join("|")
  ));
}

describe("lossless route geometry export", () => {
  it("joins all touching segments, including reversed/out-of-order parts, without overwriting", () => {
    const result = mergeRouteFeatures([
      feature([[1, 0], [2, 0]]),
      feature([[0, 0], [1, 0]]),
      feature([[3, 0], [2, 0]]),
      feature([[4, 0], [5, 0]], "12")
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].geometry).toEqual({
      type: "LineString",
      coordinates: [[0, 0], [1, 0], [2, 0], [3, 0]]
    });
  });

  it("keeps disconnected lines disconnected and retains line-based geometry collections", () => {
    const result = mergeRouteFeatures([
      {
        ...feature([]),
        geometry: {
          type: "GeometryCollection",
          geometries: [{ type: "LineString", coordinates: [[0, 0], [1, 0]] }]
        }
      },
      feature([[5, 0], [6, 0]])
    ]);
    expect(result[0].geometry).toEqual({
      type: "MultiLineString",
      coordinates: [[[0, 0], [1, 0]], [[5, 0], [6, 0]]]
    });
  });

  it("preserves every original road edge in the checked-in route assets", () => {
    const repo = path.resolve(__dirname, "..", "..");
    const source = JSON.parse(readFileSync(path.join(repo, "scripts", "tm_routes.json"), "utf8"));
    const assets = new Map<string, Set<string>>();
    const incomplete = new Set<string>();
    source.features.forEach(part => {
      const { route_number: route, direction } = part.properties;
      const key = `${route}_${direction}`;
      if (!assets.has(key)) {
        const asset = JSON.parse(readFileSync(
          path.join(repo, "public", "data", "trimet", "geoJSON", String(route), `${key}.json`),
          "utf8"
        ));
        assets.set(key, new Set(roadEdges(asset.geometry)));
      }
      if (roadEdges(part.geometry).some(edge => !assets.get(key).has(edge))) {
        incomplete.add(key);
      }
    });
    expect([...incomplete]).toEqual([]);
  });
});

describe("selected road geometry", () => {
  const origin: RouteDirectionStop = {
    locid: 101, seq: 1, desc: "Board", dir: "E", tp: true, lng: 0, lat: 0
  };
  const destination = { ...origin, locid: 102, seq: 2, lng: 2 };

  it("selects the road bends between the stops, excluding untraveled ends", () => {
    const path: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [[-1, 0], [0, 0], [0, -2], [2, -2], [2, 0], [3, 0]]
      }
    };
    expect(getSelectedRouteSegment(path, origin, destination).geometry).toEqual({
      type: "LineString",
      coordinates: [[0, 0], [0, -2], [2, -2], [2, 0]]
    });
  });

  it("snaps both stops within the same road edge instead of losing the selected segment", () => {
    const path: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: [[0, 0], [10, 0]] }
    };
    expect(getSelectedRouteSegment(
      path,
      { ...origin, lng: 2 },
      { ...destination, lng: 3 }
    ).geometry).toEqual({ type: "LineString", coordinates: [[2, 0], [3, 0]] });
  });

  it("covers the reported route 54 stop pair with a continuous road path", () => {
    const from = { ...origin, locid: 388, lng: -122.771211180556, lat: 45.4863143199906 };
    const to = { ...destination, locid: 7803, lng: -122.677859421143, lat: 45.5202440038851 };
    const source: Feature<LineString> = {
      type: "Feature",
      properties: route54.properties,
      geometry: { type: "LineString", coordinates: route54.geometry.coordinates }
    };
    const selected = getSelectedRouteSegment(source, from, to);
    expect(selected.geometry.type).toBe("LineString");
    const coordinates = selected.geometry.type === "LineString"
      ? selected.geometry.coordinates
      : selected.geometry.coordinates.flat();
    [from, to].forEach(stop => {
      const distances = coordinates.map(point =>
        111320 * Math.hypot(
          (point[0] - stop.lng) * Math.cos(stop.lat * Math.PI / 180),
          point[1] - stop.lat
        )
      );
      expect(Math.min(...distances)).toBeLessThan(30);
    });
    expect(coordinates.some(point => point[1] < Math.min(from.lat, to.lat))).toBe(true);
  });
});
