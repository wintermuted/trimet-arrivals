import { GeoJSONSource, Map as MapboxMap, MapLayerMouseEvent, Popup } from "mapbox-gl";
import { useEffect, useRef } from "react";
import { CONTEXT_OVERLAY_INFO, ContextCategory, ContextSnapshot } from "@trimet-arrivals/places/contextOverlays";

export const contextSource = (category: ContextCategory) => `nearby-context-${category}`;
export default function NearbyContextMap({ map, snapshot, onError }: {
  map?: MapboxMap;
  snapshot: ContextSnapshot;
  onError: (category: ContextCategory, error: boolean) => void;
}) {
  const latest = useRef(snapshot);
  latest.current = snapshot;
  const category = snapshot.category;
  useEffect(() => {
    if (!map) return;
    const source = contextSource(category);
    const layer = source + "-features";
    const popup = new Popup({ closeButton: false, closeOnClick: false, focusAfterOpen: false, offset: 12,
      className: "transit-place-hover-popup" });
    const hide = () => popup.remove();
    function install() {
      try {
        if (!map.getSource(source)) map.addSource(source, {
          type: "geojson", data: latest.current, attribution: "City of Portland"
        });
        const order: ContextCategory[] = ["sidewalks", "street-trees", "crossings", "crossing-deficiencies"];
        const next = order.slice(order.indexOf(category) + 1).map(item => contextSource(item) + "-features")
          .find(id => map.getLayer(id));
        const before = next || map.getStyle()?.layers?.find(item =>
          item.id.startsWith("nearby-lines-") || item.id === "nearby-trip-corridor" || item.id.startsWith("nearby-places-"))?.id;
        if (!map.getLayer(layer)) {
          if (category === "sidewalks") map.addLayer({
            id: layer, type: "fill", source,
            paint: { "fill-color": CONTEXT_OVERLAY_INFO[category].color, "fill-opacity": 0.65, "fill-emissive-strength": 1 }
          }, before);
          else map.addLayer({
            id: layer, type: "circle", source,
            paint: { "circle-color": CONTEXT_OVERLAY_INFO[category].color,
              "circle-radius": category === "crossing-deficiencies" ? 6 : category === "crossings" ? 4 : 2.5,
              "circle-stroke-color": "#ffffff", "circle-stroke-width": 1, "circle-emissive-strength": 1 }
          }, before);
        }
        onError(category, !map.getLayer(layer));
      } catch {
        onError(category, true);
      }
    }
    function hover(event: MapLayerMouseEvent) {
      const relevant = map.getStyle()?.layers?.filter(item =>
        item.id.startsWith("nearby-places-") || item.id.startsWith("nearby-context-")).map(item => item.id) || [];
      const feature = map.queryRenderedFeatures(event.point, { layers: relevant })[0];
      if (feature?.source !== source) { hide(); return; }
      const content = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = feature.properties?.name || CONTEXT_OVERLAY_INFO[category].label;
      const detail = document.createElement("p");
      detail.textContent = feature.properties?.detail || "";
      content.append(title, detail);
      popup.setLngLat(event.lngLat).setDOMContent(content).addTo(map);
    }
    function sourceError(event: { error: Error; sourceId?: string }) {
      if (event.sourceId === source) onError(category, true);
    }
    map.on("style.load", install);
    map.on("error", sourceError);
    map.on("mousemove", layer, hover);
    map.on("mouseleave", layer, hide);
    map.on("movestart", hide);
    install();
    return () => {
      map.off("style.load", install);
      map.off("error", sourceError);
      map.off("mousemove", layer, hover);
      map.off("mouseleave", layer, hide);
      map.off("movestart", hide);
      hide();
      if (map.getLayer(layer)) map.removeLayer(layer);
      if (map.getSource(source)) map.removeSource(source);
    };
  }, [map, category, onError]);
  useEffect(() => {
    try { (map?.getSource(contextSource(category)) as GeoJSONSource | undefined)?.setData(snapshot); }
    catch { onError(category, true); }
  }, [map, snapshot, category, onError]);
  return null;
}
