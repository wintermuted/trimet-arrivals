import type { MapOptions } from "mapbox-gl";
import { createThemedMap as createMap } from "@overworld/maps";
import type { MapTheme } from "@overworld/maps";

const theme: MapTheme = {
  lightPreset: () => document.documentElement.dataset.theme === "dark" ? "night" : "day",
  subscribe(listener) {
    const observer = new MutationObserver(listener);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });
    return () => observer.disconnect();
  }
};

export function createThemedMap(options: Omit<MapOptions, "style" | "config">) {
  return createMap(options, theme);
}
