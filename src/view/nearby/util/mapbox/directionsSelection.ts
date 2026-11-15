import { LngLatBounds, Map, Marker, Popup } from "mapbox-gl";
import { RouteDirectionStop } from "../../../../api/trimet/interfaces/routes";
import { addMapboxLayer, getRouteGeometry, removeRoutes } from "./routeLines";
import { getSelectedRouteSegment } from "./routeSegment";

export interface DirectionsSelection {
  routeId: number;
  direction: number;
  origin: RouteDirectionStop;
  destination?: RouteDirectionStop;
}

const DIRECTIONS_ROUTE = "directions-route";

export function showDirectionsSelection(
  map: Map,
  { routeId, direction, origin, destination }: DirectionsSelection,
  onError: () => void
): () => void {
  const request = new AbortController();
  let closed = false;
  const stops = destination ? [origin, destination] : [origin];
  const markers = stops.map((stop, index) => {
    const label = index === 0 ? "Board at" : "Get off at";
    const marker = new Marker({ color: index === 0 ? "#4264fb" : "#c55316" })
      .setLngLat([stop.lng, stop.lat])
      .setPopup(new Popup({ offset: 24 }).setText(`${label}: ${stop.desc} (${stop.locid})`))
      .addTo(map);
    marker.getElement().setAttribute("aria-label", `${label}: ${stop.desc}`);
    return marker;
  });

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
  if (destination) {
    bounds.extend([destination.lng, destination.lat]);
    fitSelection(bounds);
  } else {
    map.flyTo({ center: [origin.lng, origin.lat], zoom: 16 });
  }

  getRouteGeometry(String(routeId), direction, request.signal)
    .then(feature => {
      if (!closed) {
        const selected = destination
          ? getSelectedRouteSegment(feature, origin, destination)
          : feature;
        addMapboxLayer(map, selected, DIRECTIONS_ROUTE, {
          "line-color": "#0080ff",
          "line-opacity": 1,
          "line-width": 4
        });
        if (destination) {
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
    removeRoutes(map, [DIRECTIONS_ROUTE]);
  };
}
