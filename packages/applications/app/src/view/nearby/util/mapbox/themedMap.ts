import type { MapOptions } from "mapbox-gl";
import { createThemedMap as createMap } from "@trimet-arrivals/maps";
import type { MapTheme } from "@trimet-arrivals/maps";

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
