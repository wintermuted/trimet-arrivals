import mapboxgl, { MapOptions } from "mapbox-gl";

function lightPreset() {
  return document.documentElement.dataset.theme === "dark" ? "night" : "day";
}

export function createThemedMap(options: Omit<MapOptions, "style" | "config">) {
  const map = new mapboxgl.Map({
    ...options,
    style: "mapbox://styles/mapbox/standard",
    config: { basemap: { lightPreset: lightPreset() } }
  });
  let styleReady = false;

  function updateTheme() {
    if (styleReady && map.getConfigProperty("basemap", "lightPreset") !== lightPreset()) {
      map.setConfigProperty("basemap", "lightPreset", lightPreset());
    }
  }

  function onStyleLoad() {
    styleReady = true;
    updateTheme();
  }

  const observer = new MutationObserver(updateTheme);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"]
  });
  map.on("style.load", onStyleLoad);
  map.on("remove", cleanup);

  function cleanup() {
    observer.disconnect();
    map.off("style.load", onStyleLoad);
    map.off("remove", cleanup);
  }

  return map;
}
