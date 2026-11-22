import { FeatureCollection, Point } from "geojson";
import { LngLatBounds, Map as MapboxMap, MapLayerMouseEvent, Popup } from "mapbox-gl";
import type { RouteConfigRoute as TrimetRoute } from "@overworld/trimet-client";
import { STOP_LOCATION_LAYER } from "./consts";
import { addMapboxLayer, removeRoutes } from "./routeLines";
import type { RouteGeometryLoader } from "./transitTypes";

const STOPS = "route-info-stops";
const routeInfoControls = new WeakMap<MapboxMap, { highlight: (stopId?: number) => void }>();

function paintHighlight(map: MapboxMap, stopId?: number) {
  if (!map?.getLayer(STOPS)) return;
  map.setPaintProperty(STOPS, "circle-color", stopId === undefined
    ? "#4264fb" : ["case", ["==", ["get", "locid"], stopId], "#ff0000", "#4264fb"]);
  map.setPaintProperty(STOPS, "circle-radius", stopId === undefined
    ? 6 : ["case", ["==", ["get", "locid"], stopId], 12, 6]);
}

export function highlightRouteInfoStop(map: MapboxMap, stopId?: number) {
  const controls = map && routeInfoControls.get(map);
  if (controls) controls.highlight(stopId);
  else paintHighlight(map, stopId);
}

export function showRouteInfo(
  map: MapboxMap,
  route: TrimetRoute,
  onError: () => void,
  getRouteGeometry: RouteGeometryLoader,
  onStopClick?: (stopId: number) => void,
  canFit = () => true,
  isActive = () => true
): () => void {
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
  const stopsById = new Map(stops.map((stop) => [stop.locid, stop]));
  const popup = new Popup({ closeButton: false, closeOnClick: false });
  let listStop: number | undefined;
  let mapStop: number | undefined;
  let mapLongitude: number | undefined;

  function updateHighlight() {
    const id = mapStop ?? listStop;
    paintHighlight(map, id);
    const stop = id === undefined ? undefined : stopsById.get(id);
    if (!stop) {
      popup.remove();
      return;
    }
    const coordinates: [number, number] = [stop.lng, stop.lat];
    const longitude = mapStop === undefined ? map.getCenter().lng : mapLongitude;
    while (longitude !== undefined && Math.abs(longitude - coordinates[0]) > 180) {
      coordinates[0] += longitude > coordinates[0] ? 360 : -360;
    }
    popup.setLngLat(coordinates)
      .setText(`${stop.desc}\nStop ID: ${stop.locid}\nRoute: ${route.route}`)
      .addTo(map);
  }

  function handleMapHover(event: MapLayerMouseEvent) {
    if (!isActive()) return;
    const id = Number(event.features?.[0]?.properties?.locid);
    mapStop = stopsById.has(id) ? id : undefined;
    mapLongitude = event.lngLat.lng;
    map.getCanvas().style.cursor = "pointer";
    updateHighlight();
  }

  function handleMapLeave() {
    mapStop = undefined;
    mapLongitude = undefined;
    map.getCanvas().style.cursor = "";
    updateHighlight();
  }

  function handleMapClick(event: MapLayerMouseEvent) {
    if (!isActive()) return;
    const id = Number(event.features?.[0]?.properties?.locid);
    if (stopsById.has(id)) onStopClick?.(id);
  }

  const controls = {
    highlight: (stopId?: number) => {
      listStop = stopId;
      updateHighlight();
    }
  };
  routeInfoControls.set(map, controls);
  map.on("mouseenter", STOPS, handleMapHover);
  map.on("mousemove", STOPS, handleMapHover);
  map.on("mouseleave", STOPS, handleMapLeave);
  map.on("click", STOPS, handleMapClick);
  const bounds = new LngLatBounds();
  stops.forEach((stop) => bounds.extend([stop.lng, stop.lat]));
  const fit = () => {
    if (!canFit() || bounds.isEmpty()) return;
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
    map.off("mouseenter", STOPS, handleMapHover);
    map.off("mousemove", STOPS, handleMapHover);
    map.off("mouseleave", STOPS, handleMapLeave);
    map.off("click", STOPS, handleMapClick);
    popup.remove();
    map.getCanvas().style.cursor = "";
    if (routeInfoControls.get(map) === controls) routeInfoControls.delete(map);
    removeRoutes(map, [...ids, STOPS]);
    if (map.getLayer(STOP_LOCATION_LAYER)) {
      map.setLayoutProperty(STOP_LOCATION_LAYER, "visibility", previousVisibility ?? "visible");
    }
    if (isActive()) map.jumpTo({ center: previousCenter, zoom: previousZoom });
  };
}
