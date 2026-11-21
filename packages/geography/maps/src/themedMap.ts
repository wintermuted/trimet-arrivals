import mapboxgl from "mapbox-gl";
import type { MapOptions } from "mapbox-gl";

export interface MapTheme {
  lightPreset(): "day" | "night";
  subscribe(listener: () => void): () => void;
}

export function createThemedMap(
  options: Omit<MapOptions, "style" | "config">,
  theme: MapTheme
) {
  const map = new mapboxgl.Map({
    ...options,
    style: "mapbox://styles/mapbox/standard",
    config: { basemap: { lightPreset: theme.lightPreset() } }
  });
  let styleReady = false;

  function updateTheme() {
    if (styleReady && map.getConfigProperty("basemap", "lightPreset") !== theme.lightPreset()) {
      map.setConfigProperty("basemap", "lightPreset", theme.lightPreset());
    }
  }

  function onStyleLoad() {
    styleReady = true;
    updateTheme();
  }

  const unsubscribe = theme.subscribe(updateTheme);
  map.on("style.load", onStyleLoad);
  map.on("remove", cleanup);

  function cleanup() {
    unsubscribe();
    map.off("style.load", onStyleLoad);
    map.off("remove", cleanup);
  }

  return map;
}
