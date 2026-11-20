import { each, forEach, isUndefined, uniq } from "lodash";
import { LineLayerSpecification, Map } from "mapbox-gl";
import { Feature, Geometry, LineString, MultiLineString, Position } from "geojson";
import { NearbyRoutesDictionary } from "../../../../store/reducers/view/nearbyRoutesViewReducer";

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
  signal?: AbortSignal
): Promise<Feature<LineString | MultiLineString>> {
  const routePath = `${routeId}/${routeId}_${directionId}.json`;

  const response = await fetch(
    `${process.env.PUBLIC_URL}/data/trimet/geoJSON/${routePath}`,
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

export const NEARBY_ROUTE_LINES = "nearby-route-lines";

export function showNearbyRouteLines(map: Map, routes: NearbyRoutesDictionary): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  const requests = Object.entries(routes).flatMap(([routeId, route]) =>
    Array.from(new Set(route.directions)).map(async direction => {
      try {
        return await getRouteGeometry(routeId, direction, signal);
      } catch (error) {
        if (!signal.aborted) console.warn(`Could not load nearby route ${routeId}, direction ${direction}`, error);
        return undefined;
      }
    })
  );
  void Promise.all(requests).then(results => {
    if (signal.aborted) return;
    const features = results.filter((feature): feature is Feature<LineString | MultiLineString> => feature !== undefined);
    if (!features.length) return;
    map.addSource(NEARBY_ROUTE_LINES, { type: "geojson", data: { type: "FeatureCollection", features } });
    map.addLayer({
      id: NEARBY_ROUTE_LINES,
      source: NEARBY_ROUTE_LINES,
      type: "line",
      slot: "middle",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#0080ff", "line-emissive-strength": 1, "line-opacity": 0.6, "line-width": 3 }
    });
  }).catch(error => {
    console.warn("Could not display nearby route lines", error);
  });

  return () => {
    controller.abort();
    removeRoutes(map, [NEARBY_ROUTE_LINES]);
  };
}

export function addMapboxLayer(
  map: Map,
  feature: Feature<LineString | MultiLineString>,
  sourceId: string,
  paint: LineLayerSpecification["paint"] = {
    "line-color": "#0080ff",
    "line-dasharray": [2, 4],
    "line-opacity": 0.8,
    "line-width": 2
  }
): Map {
  map.addSource(sourceId, {
    data: {
      geometry: feature.geometry,
      properties: {},
      type: "Feature"
    },
    type: "geojson"
  });

  return map.addLayer({
    id: sourceId,
    layout: {
      "line-cap": "round",
      "line-join": "round"
    },
    paint,
    source: sourceId,
    type: "line"
  });
}

function addRouteLayers(mapBoxMap: Map, returnedPromises: any[]): string[] {
  const sources = {};
  const sourceIds = [];
  const routeLayers = [];

  each(returnedPromises, promise => {
    if (promise) {
      const { route_number, direction } = promise.properties;
      const routeIdentifier = `${route_number}_${direction}`;
      const sourceId = `route-${routeIdentifier}`;
      sourceIds.push(sourceId);

      if (isUndefined(sources[sourceId])) {
        sources[sourceId] = {};
        const mapboxMap = addMapboxLayer(mapBoxMap, promise, sourceId);
        routeLayers.push(mapboxMap);
      }
    }
  });

  return sourceIds;
}

export async function setRoutes(
  mapBoxMap: Map,
  nearbyRouteIds: NearbyRoutesDictionary
): Promise<string[]> {
  const promises = [];

  each(nearbyRouteIds, (route, routeId) => {
    each(route.directions, directionId => {
      const promise = getRouteGeometry(routeId, directionId).catch(error => {
        // tslint:disable-next-line:no-console
        console.error(error);
        return undefined;
      });
      promises.push(promise);
    });
  });

  try {
    const returnedPromises = await Promise.all(promises);
    return await Promise.resolve(addRouteLayers(mapBoxMap, returnedPromises));
  } catch (err) {
    // tslint:disable
    console.error(err);
    return await Promise.resolve([]);
  }
}

export function removeRoutes(map: Map, routeLayers: any[]): Map {
  forEach(uniq(routeLayers), layerId => {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(layerId)) {
      map.removeSource(layerId);
    }
  });

  return map;
}
