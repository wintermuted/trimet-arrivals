import { FeatureCollection, Point } from "geojson";
import { LngLatBounds, Map as MapboxMap, Marker, Popup } from "mapbox-gl";
import { RouteDirectionStop } from "../../../../api/trimet/interfaces/routes";
import { addMapboxLayer, getRouteGeometry, removeRoutes } from "./routeLines";
import { getSelectedRouteSegment } from "./routeSegment";

export interface DirectionsSelection {
  routeId: number;
  direction: number;
  origin: RouteDirectionStop;
  destination?: RouteDirectionStop;
  destinationStops?: RouteDirectionStop[];
}

const DIRECTIONS_ROUTE = "directions-route";
const DIRECTIONS_STOPS = "directions-stops";

export function highlightDirectionsStop(map: MapboxMap, stopId?: number) {
  if (!map?.getLayer(DIRECTIONS_STOPS)) {
    return;
  }
  map.setPaintProperty(DIRECTIONS_STOPS, "circle-color", stopId === undefined
    ? ["get", "color"]
    : ["case", ["==", ["get", "locid"], stopId], "#ff0000", ["get", "color"]]);
  map.setPaintProperty(DIRECTIONS_STOPS, "circle-radius", stopId === undefined
    ? 8 : ["case", ["==", ["get", "locid"], stopId], 12, 8]);
}

export function showDirectionsSelection(
  map: MapboxMap,
  { routeId, direction, origin, destination, destinationStops }: DirectionsSelection,
  onError: () => void
): () => void {
  const request = new AbortController();
  let closed = false;
  const stops = destination && !destinationStops ? [origin, destination] : [origin];
  const markers = stops.map((stop, index) => {
    const label = index === 0 ? "Board at" : "Get off at";
    const marker = new Marker({ color: index === 0 ? "#4264fb" : "#c55316" })
      .setLngLat([stop.lng, stop.lat])
      .setPopup(new Popup({ offset: 24 }).setText(`${label}: ${stop.desc} (${stop.locid})`))
      .addTo(map);
    marker.getElement().setAttribute("aria-label", `${label}: ${stop.desc}`);
    return marker;
  });

  if (destinationStops) {
    const uniqueStops = Array.from(new Map<number, RouteDirectionStop>(
      destinationStops.map(stop => [stop.locid, stop])
    ).values());
    const data: FeatureCollection<Point> = {
      features: uniqueStops.map(stop => ({
        geometry: { type: "Point", coordinates: [stop.lng, stop.lat] },
        properties: {
          color: stop.locid === destination?.locid ? "#c55316" : "#4264fb",
          locid: stop.locid
        },
        type: "Feature"
      })),
      type: "FeatureCollection"
    };
    map.addSource(DIRECTIONS_STOPS, { data, type: "geojson" });
    map.addLayer({
      id: DIRECTIONS_STOPS,
      paint: {
        "circle-color": ["get", "color"],
        "circle-emissive-strength": 1,
        "circle-radius": 8,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2
      },
      source: DIRECTIONS_STOPS,
      type: "circle"
    });
  }

  function fitSelection(bounds: LngLatBounds) {
    const container = map.getContainer();
    const horizontalPadding = Math.min(48, container.clientWidth / 5);
    const padding = {
      top: Math.min(48, container.clientHeight * 0.45),
      bottom: Math.min(48, container.clientHeight / 5),
      left: horizontalPadding,
      right: horizontalPadding
    };
    map.fitBounds(bounds, { padding, maxZoom: 16, duration: 500 });
  }

  const bounds = new LngLatBounds([origin.lng, origin.lat], [origin.lng, origin.lat]);
  if (destinationStops || destination) {
    if (destinationStops) {
      destinationStops.forEach(stop => bounds.extend([stop.lng, stop.lat]));
    } else if (destination) {
      bounds.extend([destination.lng, destination.lat]);
    }
    fitSelection(bounds);
  } else {
    map.flyTo({ center: [origin.lng, origin.lat], zoom: 16 });
  }

  getRouteGeometry(String(routeId), direction, request.signal)
    .then(feature => {
      if (!closed) {
        const routeEnd = destinationStops
          ? destinationStops[destinationStops.length - 1] ?? origin
          : destination;
        const selected = routeEnd
          ? getSelectedRouteSegment(feature, origin, routeEnd)
          : feature;
        addMapboxLayer(map, selected, DIRECTIONS_ROUTE, {
          "line-color": "#0080ff",
          "line-opacity": 1,
          "line-width": 4
        });
        if (destinationStops) {
          map.moveLayer(DIRECTIONS_ROUTE, DIRECTIONS_STOPS);
        }
        if (destinationStops || destination) {
          const lines = selected.geometry.type === "LineString"
            ? [selected.geometry.coordinates]
            : selected.geometry.coordinates;
          lines.forEach(line => line.forEach(point => bounds.extend([point[0], point[1]])));
          fitSelection(bounds);
        }
      }
    })
    .catch(() => {
      if (!closed) {
        onError();
      }
    });

  return () => {
    closed = true;
    request.abort();
    markers.forEach(marker => marker.remove());
    removeRoutes(map, destinationStops ? [DIRECTIONS_ROUTE, DIRECTIONS_STOPS] : [DIRECTIONS_ROUTE]);
  };
}
