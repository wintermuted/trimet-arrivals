import React, { useEffect, useState } from "react";
import { LngLatBounds, Map as MapboxMap } from "mapbox-gl";
import { TripPlannerItinerary } from "../../../api/trimet/tripplanner";
import { loadPlannerPaths } from "../util/mapbox/plannerPaths";

const SOURCE = "planner-itineraries";
const OTHER = `${SOURCE}-alternatives`;
const CASING = `${SOURCE}-selected-casing`;
const ACTIVE = `${SOURCE}-selected`;

export default function NearbyPlannerPaths({ map, itineraries, selected }: {
  map?: MapboxMap;
  itineraries: TripPlannerItinerary[];
  selected: number;
}) {
  const [loaded, setLoaded] = useState<{
    itineraries: TripPlannerItinerary[];
    paths: Awaited<ReturnType<typeof loadPlannerPaths>>;
  }>();
  const result = loaded?.itineraries === itineraries ? loaded.paths : undefined;
  const [mapError, setMapError] = useState(false);
  const mapSelection = React.useRef(selected);
  const applySelection = React.useRef<() => void>();

  useEffect(() => {
    mapSelection.current = selected;
    applySelection.current?.();
  }, [selected]);

  useEffect(() => {
    const controller = new AbortController();
    void loadPlannerPaths(itineraries, controller.signal).then(paths => {
      if (!controller.signal.aborted) setLoaded({ itineraries, paths });
    });
    return () => controller.abort();
  }, [itineraries]);

  useEffect(() => {
    if (!map || !result?.data.features.length) return;
    const { data } = result;
    let fitted = false;
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
          id: CASING, source: SOURCE, type: "line", slot: "top", layout,
          paint: { "line-color": "#f8fbff", "line-width": 9, "line-emissive-strength": 1 }
        });
        map.addLayer({
          id: ACTIVE, source: SOURCE, type: "line", slot: "top", layout,
          paint: { "line-color": "#1559d1", "line-width": 5, "line-emissive-strength": 1 }
        });
        updateSelection();
        if (!fitted) {
          const bounds = new LngLatBounds();
          data.features.forEach(({ geometry }) => {
            const lines = geometry.type === "LineString" ? [geometry.coordinates] : geometry.coordinates;
            lines.forEach(line => line.forEach(([lng, lat]) => bounds.extend([lng, lat])));
          });
          const { clientWidth, clientHeight } = map.getContainer();
          const padding = Math.floor(Math.min(44, clientWidth / 6, clientHeight / 6));
          map.fitBounds(bounds, { padding, maxZoom: 16, duration: 0 });
          fitted = true;
        }
        setMapError(false);
      } catch {
        removeLayers();
        setMapError(true);
      }
    }

    function updateSelection() {
      if (!map.getLayer(ACTIVE)) return;
      const trip = mapSelection.current;
      map.setFilter(OTHER, ["!=", ["get", "trip"], trip]);
      map.setFilter(CASING, ["==", ["get", "trip"], trip]);
      map.setFilter(ACTIVE, ["==", ["get", "trip"], trip]);
    }

    function removeLayers() {
      [ACTIVE, CASING, OTHER].forEach(id => {
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

  let message: string;
  if (!result) message = "Loading trip paths…";
  else if (!result.data.features.length) message = "Trip paths are unavailable for these options.";
  else if (mapError) message = "Trip paths could not be displayed on the map.";
  else if (!map) message = "Waiting for the map to load…";
  else {
    const trip = result.coverage[selected];
    const incomplete = result.coverage.some(({ paths, total }) => !total || paths.length < total);
    message = !trip?.paths.length
      ? "No path is available for the selected trip. Other available paths are shown in gray."
      : `Selected trip in blue${itineraries.length > 1 ? "; other available paths in gray" : ""}.${incomplete ?
        " Some legs aren't shown because their paths are unavailable." : ""}`;
  }
  return <p className="transit-planner-partial" role="status">{message}</p>;
}
