import { Position } from "geojson";
import { Map as MapboxMap } from "mapbox-gl";
import { useEffect } from "react";

const SOURCE = "nearby-trip-corridor";
export default function NearbyTripCorridorMap({ map, lines, onError }: {
  map?: MapboxMap; lines: Position[][]; onError: (error: boolean) => void;
}) {
  useEffect(() => {
    if (!map) return;
    function install() {
      try {
        if (!map.getSource(SOURCE)) map.addSource(SOURCE, { type: "geojson", data: {
          type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: lines }
        } });
        if (!map.getLayer(SOURCE)) map.addLayer({
          id: SOURCE, source: SOURCE, type: "line",
          paint: { "line-color": "#1559d1", "line-width": 4, "line-opacity": 0.85, "line-emissive-strength": 1 }
        }, map.getStyle()?.layers?.find(layer => layer.id.startsWith("nearby-places-"))?.id);
        onError(!map.getLayer(SOURCE));
      } catch { onError(true); }
    }
    const sourceError = (event: { error: Error; sourceId?: string }) => { if (event.sourceId === SOURCE) onError(true); };
    map.on("style.load", install);
    map.on("error", sourceError);
    install();
    return () => {
      map.off("style.load", install);
      map.off("error", sourceError);
      if (map.getLayer(SOURCE)) map.removeLayer(SOURCE);
      if (map.getSource(SOURCE)) map.removeSource(SOURCE);
    };
  }, [map, lines, onError]);
  return null;
}
