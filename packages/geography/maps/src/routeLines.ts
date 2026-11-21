import { LineLayerSpecification, Map } from "mapbox-gl";
import { Feature, LineString, MultiLineString } from "geojson";
import type { NearbyRouteDirections, RouteGeometryLoader } from "./transitTypes";

export const NEARBY_ROUTE_LINES = "nearby-route-lines";

export function showNearbyRouteLines(
  map: Map, routes: NearbyRouteDirections, getRouteGeometry: RouteGeometryLoader
): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  const requests = Object.keys(routes).flatMap(routeId =>
    Array.from(new Set(routes[Number(routeId)].directions)).map(async direction => {
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

  try {
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
  } catch (error) {
    if (map.getLayer(sourceId)) map.removeLayer(sourceId);
    map.removeSource(sourceId);
    throw error;
  }
}

function addRouteLayers(
  mapBoxMap: Map, features: Array<Feature<LineString | MultiLineString> | undefined>
): string[] {
  const sources = new Set<string>();
  const sourceIds: string[] = [];

  try {
    for (const feature of features) {
      if (feature) {
        const { route_number, direction } = feature.properties;
        const routeIdentifier = `${route_number}_${direction}`;
        const sourceId = `route-${routeIdentifier}`;
        sourceIds.push(sourceId);

        if (!sources.has(sourceId)) {
          sources.add(sourceId);
          addMapboxLayer(mapBoxMap, feature, sourceId);
        }
      }
    }
  } catch (error) {
    removeRoutes(mapBoxMap, [...sources]);
    throw error;
  }

  return sourceIds;
}

export async function setRoutes(
  mapBoxMap: Map,
  nearbyRouteIds: NearbyRouteDirections,
  getRouteGeometry: RouteGeometryLoader
): Promise<string[]> {
  const promises = Object.entries(nearbyRouteIds).flatMap(([routeId, route]) =>
    route.directions.map(directionId =>
      getRouteGeometry(routeId, directionId).catch(error => {
        console.error(error);
        return undefined;
      })
    )
  );
  return addRouteLayers(mapBoxMap, await Promise.all(promises));
}

export function removeRoutes(map: Map, routeLayers: readonly string[]): Map {
  for (const layerId of new Set(routeLayers)) {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(layerId)) {
      map.removeSource(layerId);
    }
  }

  return map;
}
