import React, { useEffect, useMemo, useState } from "react";
import { LngLatBounds, Map as MapboxMap, Marker } from "mapbox-gl";
import { TripPlannerItinerary } from "../../../api/trimet/tripplanner";
import { loadPlannerPaths } from "../util/mapbox/plannerPaths";

const SOURCE = "planner-itineraries";
const OTHER = `${SOURCE}-alternatives`;
const CASING = `${SOURCE}-selected-casing`;
const ACTIVE = `${SOURCE}-selected`;
const OTHER_WALK = `${OTHER}-walk`;
const ACTIVE_WALK = `${ACTIVE}-walk`;

function itineraryStops(itinerary: TripPlannerItinerary) {
  const stops = new Map<string, { point: [number, number]; labels: Set<string>; board: boolean; exit: boolean }>();
  for (const leg of itinerary.legs) {
    if (leg.mode?.toLowerCase() === "walk") continue;
    for (const [action, stop] of [["board", leg.from], ["exit", leg.to]] as const) {
      if (!stop?.stopId || !Number.isFinite(stop.lon) || !Number.isFinite(stop.lat) ||
          Math.abs(stop.lon) > 180 || Math.abs(stop.lat) > 90) continue;
      const key = String(stop.stopId);
      if (!stops.has(key)) {
        stops.set(key, { point: [stop.lon, stop.lat], labels: new Set(), board: false, exit: false });
      }
      const marker = stops.get(key);
      marker[action] = true;
      const route = leg.route?.name || leg.route?.number || leg.mode;
      marker.labels.add(`${action === "board" ? "Board" : "Get off"}${route ? `: ${route} at ` : " at "}${stop.description || `stop ${stop.stopId}`}`);
    }
  }
  return [...stops.values()];
}

export default function NearbyPlannerPaths({ map, itineraries, selected, walkingEnabled }: {
  map?: MapboxMap;
  itineraries: TripPlannerItinerary[];
  selected: number;
  walkingEnabled: boolean;
}) {
  const includeWalking = walkingEnabled && Boolean(map);
  const [loaded, setLoaded] = useState<{
    itineraries: TripPlannerItinerary[];
    includeWalking: boolean;
    paths: Awaited<ReturnType<typeof loadPlannerPaths>>;
  }>();
  const result = loaded?.itineraries === itineraries && loaded.includeWalking === includeWalking
    ? loaded.paths : undefined;
  const [mapError, setMapError] = useState(false);
  const mapSelection = React.useRef(selected);
  const applySelection = React.useRef<() => void>();
  const stopsByTrip = useMemo(() => itineraries.map(itineraryStops), [itineraries]);
  const selectedStops = stopsByTrip[selected];

  useEffect(() => {
    if (!map || !selectedStops?.length) return;
    const markers = selectedStops.map(stop => {
      const label = [...stop.labels].join("; ");
      const element = document.createElement("div");
      element.className = "transit-planner-stop-marker";
      element.setAttribute("role", "img");
      element.setAttribute("aria-label", label);
      element.title = label;
      element.textContent = stop.board && stop.exit ? "↕" : stop.board ? "↑" : "↓";
      return new Marker({ element }).setLngLat(stop.point).addTo(map);
    });
    return () => markers.forEach(marker => marker.remove());
  }, [map, selectedStops]);

  useEffect(() => {
    mapSelection.current = selected;
    applySelection.current?.();
  }, [selected]);

  useEffect(() => {
    const controller = new AbortController();
    void loadPlannerPaths(itineraries, controller.signal, includeWalking).then(paths => {
      if (!controller.signal.aborted) setLoaded({ itineraries, includeWalking, paths });
    });
    return () => controller.abort();
  }, [itineraries, includeWalking]);

  useEffect(() => {
    if (!map || !result?.data.features.length) return;
    const { data } = result;
    function installLayers() {
      if (map.getSource(SOURCE)) return;
      try {
        map.addSource(SOURCE, { type: "geojson", data });
        const layout = { "line-cap": "round", "line-join": "round" } as const;
        map.addLayer({
          id: OTHER, source: SOURCE, type: "line", slot: "top", layout,
          paint: { "line-color": "#667b92", "line-width": 3.5, "line-opacity": 0.85, "line-emissive-strength": 1 }
        });
        map.addLayer({
          id: OTHER_WALK, source: SOURCE, type: "line", slot: "top", layout,
          paint: { "line-color": "#667b92", "line-width": 3, "line-dasharray": [1, 2], "line-emissive-strength": 1 }
        });
        map.addLayer({
          id: CASING, source: SOURCE, type: "line", slot: "top", layout,
          paint: { "line-color": "#f8fbff", "line-width": 9, "line-emissive-strength": 1 }
        });
        map.addLayer({
          id: ACTIVE, source: SOURCE, type: "line", slot: "top", layout,
          paint: { "line-color": "#1559d1", "line-width": 5, "line-emissive-strength": 1 }
        });
        map.addLayer({
          id: ACTIVE_WALK, source: SOURCE, type: "line", slot: "top", layout,
          paint: { "line-color": "#1559d1", "line-width": 4, "line-dasharray": [1, 2], "line-emissive-strength": 1 }
        });
        updateSelection();
        setMapError(false);
      } catch {
        removeLayers();
        setMapError(true);
      }
    }

    function updateSelection() {
      if (!map.getLayer(ACTIVE)) return;
      const trip = mapSelection.current;
      const filter = (layer: string, operator: "==" | "!=", walk: boolean) =>
        map.setFilter(layer, ["all", [operator, ["get", "trip"], trip], ["==", ["get", "walk"], walk]]);
      filter(OTHER, "!=", false);
      filter(OTHER_WALK, "!=", true);
      filter(CASING, "==", false);
      filter(ACTIVE, "==", false);
      filter(ACTIVE_WALK, "==", true);
    }

    function removeLayers() {
      [ACTIVE_WALK, ACTIVE, CASING, OTHER_WALK, OTHER].forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource(SOURCE)) map.removeSource(SOURCE);
    }

    installLayers();
    map.on("style.load", installLayers);
    applySelection.current = updateSelection;
    return () => {
      applySelection.current = undefined;
      map.off("style.load", installLayers);
      removeLayers();
    };
  }, [map, result]);

  useEffect(() => {
    if (!map || !result) return;
    const bounds = new LngLatBounds();
    const points = stopsByTrip.flatMap(stops => stops.map(stop => stop.point));
    result.data.features.forEach(({ geometry }) => {
      const lines = geometry.type === "LineString" ? [geometry.coordinates] : geometry.coordinates;
      lines.forEach(line => line.forEach(([lng, lat]) => points.push([lng, lat])));
    });
    if (!points.length) return;
    points.forEach(point => bounds.extend(point));
    const { clientWidth, clientHeight } = map.getContainer();
    const padding = Math.floor(Math.min(44, clientWidth / 6, clientHeight / 6));
    map.fitBounds(bounds, { padding, maxZoom: 16, duration: 0 });
  }, [map, result, stopsByTrip]);

  return mapError ? <small role="alert">Trip paths could not be displayed.</small> : null;
}
