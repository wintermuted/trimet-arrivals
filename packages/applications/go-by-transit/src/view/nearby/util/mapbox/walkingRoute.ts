import { Feature, LineString } from "geojson";
import { LngLatBounds, Map } from "mapbox-gl";
import { addMapboxLayer, removeRoutes } from "./routeLines";

const WALKING_ROUTE = "walking-access-route";

export function showWalkingRoute(
  map: Map,
  feature: Feature<LineString>
): () => void {
  addMapboxLayer(map, feature, WALKING_ROUTE, {
    "line-color": "#198754",
    "line-dasharray": [1, 2],
    "line-emissive-strength": 1,
    "line-opacity": 1,
    "line-width": 4,
  });
  const first = feature.geometry.coordinates[0];
  const bounds = new LngLatBounds([first[0], first[1]], [first[0], first[1]]);
  feature.geometry.coordinates.forEach((point) =>
    bounds.extend([point[0], point[1]])
  );
  const container = map.getContainer();
  map.fitBounds(bounds, {
    duration: 500,
    maxZoom: 16,
    padding: Math.min(
      40,
      container.clientWidth / 5,
      container.clientHeight / 5
    ),
  });
  return () => {
    removeRoutes(map, [WALKING_ROUTE]);
  };
}
