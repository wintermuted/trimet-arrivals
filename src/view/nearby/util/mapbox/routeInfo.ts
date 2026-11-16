import { FeatureCollection, Point } from "geojson";
import { LngLatBounds, Map as MapboxMap } from "mapbox-gl";
import { TrimetRoute } from "../../../../api/trimet/interfaces/routes";
import { STOP_LOCATION_LAYER } from "./consts";
import { addMapboxLayer, getRouteGeometry, removeRoutes } from "./routeLines";

const STOPS = "route-info-stops";

export function showRouteInfo(map: MapboxMap, route: TrimetRoute, onError: () => void): () => void {
  const abort = new AbortController();
  let closed = false;
  const previousCenter = map.getCenter();
  const previousZoom = map.getZoom();
  const previousVisibility = map.getLayer(STOP_LOCATION_LAYER)
    ? map.getLayoutProperty(STOP_LOCATION_LAYER, "visibility") : undefined;
  if (map.getLayer(STOP_LOCATION_LAYER)) {
    map.setLayoutProperty(STOP_LOCATION_LAYER, "visibility", "none");
  }
  const stops = Array.from(new Map(route.dir.flatMap((direction) =>
    direction.stop.filter((stop) => Number.isFinite(stop.lng) && Number.isFinite(stop.lat))
      .map((stop) => [stop.locid, stop] as const)
  )).values());
  const data: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: stops.map((stop) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [stop.lng, stop.lat] },
      properties: { locid: stop.locid, desc: stop.desc }
    }))
  };
  map.addSource(STOPS, { type: "geojson", data });
  map.addLayer({
    id: STOPS, type: "circle", source: STOPS,
    paint: {
      "circle-color": "#4264fb", "circle-emissive-strength": 1,
      "circle-radius": 6, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2
    }
  });
  const bounds = new LngLatBounds();
  stops.forEach((stop) => bounds.extend([stop.lng, stop.lat]));
  const fit = () => {
    if (bounds.isEmpty()) return;
    const container = map.getContainer();
    const horizontal = Math.min(48, container.clientWidth / 5);
    map.fitBounds(bounds, {
      padding: { left: horizontal, right: horizontal, top: Math.min(48, container.clientHeight / 5), bottom: Math.min(48, container.clientHeight / 5) },
      maxZoom: 16, duration: 500
    });
  };
  fit();
  const ids = route.dir.map((direction) => `route-info-${direction.dir}`);
  route.dir.forEach((direction, index) => {
    getRouteGeometry(String(route.route), direction.dir, abort.signal).then((feature) => {
      if (closed) return;
      addMapboxLayer(map, feature, ids[index], {
        "line-color": index % 2 ? "#c55316" : "#0080ff",
        "line-opacity": 0.9, "line-width": 4
      });
      map.moveLayer(ids[index], STOPS);
      const lines = feature.geometry.type === "LineString"
        ? [feature.geometry.coordinates] : feature.geometry.coordinates;
      lines.forEach((line) => line.forEach((point) => bounds.extend([point[0], point[1]])));
      fit();
    }).catch(() => { if (!closed) onError(); });
  });
  return () => {
    closed = true;
    abort.abort();
    removeRoutes(map, [...ids, STOPS]);
    if (map.getLayer(STOP_LOCATION_LAYER)) {
      map.setLayoutProperty(STOP_LOCATION_LAYER, "visibility", previousVisibility ?? "visible");
    }
    map.jumpTo({ center: previousCenter, zoom: previousZoom });
  };
}
