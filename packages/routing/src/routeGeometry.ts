import { Feature, Geometry, LineString, MultiLineString, Position } from "geojson";

export interface RouteGeometryOptions {
  baseUrl: string;
  signal?: AbortSignal;
}

function lineParts(geometry: Geometry): Position[][] {
  if (geometry.type === "LineString") {
    return [geometry.coordinates];
  }
  if (geometry.type === "MultiLineString") {
    return geometry.coordinates;
  }
  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.flatMap(lineParts);
  }
  throw new Error(`Unsupported route geometry: ${geometry.type}`);
}

export async function getRouteGeometry(
  routeId: string,
  directionId: number,
  { baseUrl, signal }: RouteGeometryOptions
): Promise<Feature<LineString | MultiLineString>> {
  const routePath = `${routeId}/${routeId}_${directionId}.json`;
  const response = await fetch(
    `${baseUrl.replace(/\/+$/, "")}/data/trimet/geoJSON/${routePath}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error(
      `Unable to load route geometry ${routePath}: ${response.status} ${response.statusText}`
    );
  }
  const feature: Feature = await response.json();
  const geometry = feature?.geometry;
  if (geometry?.type === "GeometryCollection") {
    const coordinates = lineParts(geometry);
    if (!coordinates.length) {
      throw new Error(`Empty route geometry ${routePath}`);
    }
    return { ...feature, geometry: { type: "MultiLineString", coordinates } };
  }
  if (
    (geometry?.type !== "LineString" &&
      geometry?.type !== "MultiLineString") ||
    !geometry.coordinates.length
  ) {
    throw new Error(`Invalid route geometry ${routePath}`);
  }
  return { ...feature, geometry };
}
