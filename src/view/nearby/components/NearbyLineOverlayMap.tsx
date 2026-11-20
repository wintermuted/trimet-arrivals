import { ExpressionSpecification, Map as MapboxMap } from "mapbox-gl";
import { useEffect } from "react";
import { LINE_CAUTION_COLOR, LINE_OVERLAY_INFO, LineOverlayCategory, LineOverlaySnapshot } from "@trimet-arrivals/places/lineOverlays";

export const lineOverlaySource = (category: LineOverlayCategory) => `nearby-lines-${category}`;
export default function NearbyLineOverlayMap({ map, snapshot, onError }: {
  map?: MapboxMap;
  snapshot: LineOverlaySnapshot;
  onError: (category: LineOverlayCategory, error: boolean) => void;
}) {
  useEffect(() => {
    if (!map) return;
    const category = snapshot.category;
    const source = lineOverlaySource(category);
    const layerIds = [source + "-halo", source + "-line",
      ...(category === "recommended-bike-routes" ? [source + "-caution"] : [])];
    const width = (padding = 0): ExpressionSpecification => ["interpolate", ["linear"], ["zoom"],
      9, 1 + padding, 14, (category === "bicycle-network" ? 4 : 2.5) + padding,
      18, (category === "bicycle-network" ? 7 : 5) + padding];
    function install() {
      try {
        if (!map.getSource(source)) map.addSource(source, {
          type: "geojson", data: snapshot, tolerance: 0.3,
          attribution: snapshot.source
        });
        const order: LineOverlayCategory[] = ["bicycle-network", "park-trails", "recommended-bike-routes"];
        const next = order.slice(order.indexOf(category) + 1).map(item => lineOverlaySource(item) + "-halo")
          .find(id => map.getLayer(id));
        const before = next || map.getStyle()?.layers?.find(layer => layer.id === "nearby-trip-corridor" || layer.id.startsWith("nearby-places-"))?.id;
        if (!map.getLayer(layerIds[0])) map.addLayer({
          id: layerIds[0], type: "line", source,
          paint: { "line-color": "#ffffff", "line-opacity": 0.75,
            "line-width": width(2), "line-emissive-strength": 1 }
        }, before);
        if (!map.getLayer(layerIds[1])) map.addLayer({
          id: layerIds[1], type: "line", source, filter: ["==", ["get", "kind"], "standard"],
          paint: { "line-color": LINE_OVERLAY_INFO[category].color,
            "line-width": width(), "line-emissive-strength": 1,
            ...(category === "park-trails" ? { "line-dasharray": [2, 1.5] } : {}) }
        }, before);
        if (category === "recommended-bike-routes" && !map.getLayer(layerIds[2])) map.addLayer({
          id: layerIds[2], type: "line", source, filter: ["==", ["get", "kind"], "caution"],
          paint: { "line-color": LINE_CAUTION_COLOR, "line-width": width(),
            "line-dasharray": [2, 1], "line-emissive-strength": 1 }
        }, before);
        onError(category, layerIds.some(id => !map.getLayer(id)));
      } catch {
        onError(category, true);
      }
    }
    function sourceError(event: { error: Error; sourceId?: string }) {
      if (event.sourceId === source) onError(category, true);
    }
    map.on("style.load", install);
    map.on("error", sourceError);
    install();
    return () => {
      map.off("style.load", install);
      map.off("error", sourceError);
      for (const id of [...layerIds].reverse()) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(source)) map.removeSource(source);
    };
  }, [map, snapshot, onError]);
  return null;
}
