import { ExpressionSpecification, Map as MapboxMap } from "mapbox-gl";
import { useEffect, useRef } from "react";
import { NeighborhoodSnapshot } from "@trimet-arrivals/places/neighborhoods";

export const NEIGHBORHOOD_SOURCE = "nearby-neighborhoods";
export const NEIGHBORHOOD_LAYERS = ["fill", "boundary", "labels"].map(suffix => `${NEIGHBORHOOD_SOURCE}-${suffix}`);
const areaColor: ExpressionSpecification = ["match", ["%", ["get", "areaId"], 8],
  0, "#56b4e9", 1, "#e69f00", 2, "#009e73", 3, "#cc79a7",
  4, "#c6b543", 5, "#647fd2", 6, "#e17c55", "#55b6ae"];

export default function NeighborhoodsMap({ map, snapshot, polygonsShown, onError }: {
  map?: MapboxMap;
  snapshot: NeighborhoodSnapshot;
  polygonsShown: boolean;
  onError: (error: boolean) => void;
}) {
  const latestPolygons = useRef(polygonsShown);
  latestPolygons.current = polygonsShown;
  const update = useRef<() => void>(undefined);
  useEffect(() => {
    if (!map) return;
    function updatePolygons() {
      if (map.getLayer(NEIGHBORHOOD_LAYERS[0])) {
        map.setLayoutProperty(NEIGHBORHOOD_LAYERS[0], "visibility", latestPolygons.current ? "visible" : "none");
      }
      if (map.getLayer(NEIGHBORHOOD_LAYERS[1])) {
        map.setPaintProperty(NEIGHBORHOOD_LAYERS[1], "line-width", latestPolygons.current ? 2 : 1.5);
        map.setPaintProperty(NEIGHBORHOOD_LAYERS[1], "line-color", latestPolygons.current ? areaColor : "#8294b0");
      }
    }
    update.current = updatePolygons;
    function install() {
      try {
        if (!map.getSource(NEIGHBORHOOD_SOURCE)) map.addSource(NEIGHBORHOOD_SOURCE, {
          type: "geojson", data: snapshot,
          attribution: "City of Portland, Bureau of Planning and Sustainability"
        });
        const before = map.getStyle()?.layers?.find(layer =>
          layer.id.startsWith("nearby-context-") || layer.id.startsWith("nearby-lines-") ||
          layer.id === "nearby-trip-corridor" || layer.id.startsWith("nearby-places-"))?.id;
        if (!map.getLayer(NEIGHBORHOOD_LAYERS[0])) map.addLayer({
          id: NEIGHBORHOOD_LAYERS[0], type: "fill", source: NEIGHBORHOOD_SOURCE,
          layout: { visibility: latestPolygons.current ? "visible" : "none" },
          paint: { "fill-color": areaColor, "fill-opacity": 0.28, "fill-emissive-strength": 1 }
        }, before);
        if (!map.getLayer(NEIGHBORHOOD_LAYERS[1])) map.addLayer({
          id: NEIGHBORHOOD_LAYERS[1], type: "line", source: NEIGHBORHOOD_SOURCE,
          paint: { "line-color": "#8294b0", "line-width": 1.5, "line-opacity": 0.8,
            "line-dasharray": [3, 2], "line-emissive-strength": 1 }
        }, before);
        if (!map.getLayer(NEIGHBORHOOD_LAYERS[2])) map.addLayer({
          id: NEIGHBORHOOD_LAYERS[2], type: "symbol", source: NEIGHBORHOOD_SOURCE, minzoom: 11,
          layout: {
            "text-field": ["get", "name"], "text-size": 12, "text-max-width": 11,
            "text-padding": 12, "text-allow-overlap": false
          },
          paint: { "text-color": "#ffffff", "text-halo-color": "#30415d",
            "text-halo-width": 1.5, "text-emissive-strength": 1 }
        }, before);
        updatePolygons();
        onError(false);
      } catch {
        onError(true);
      }
    }
    map.on("style.load", install);
    install();
    return () => {
      update.current = undefined;
      map.off("style.load", install);
      for (const id of [...NEIGHBORHOOD_LAYERS].reverse()) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(NEIGHBORHOOD_SOURCE)) map.removeSource(NEIGHBORHOOD_SOURCE);
    };
  }, [map, snapshot, onError]);
  useEffect(() => {
    try { update.current?.(); }
    catch { onError(true); }
  }, [polygonsShown, onError]);
  return null;
}
