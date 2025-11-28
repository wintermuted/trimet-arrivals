import circle from "@turf/circle";
import { GeoJSONSource, Map } from "mapbox-gl";
import {
  CURRENT_LOCATION_CIRCLE,
  CURRENT_LOCATION_CIRCLE_LAYER,
  CURRENT_LOCATION_RADIUS,
  CURRENT_LOCATION_RADIUS_LAYER
} from "./consts";

export function drawCircle(
  map: Map,
  lng: number,
  lat: number,
  radiusSize: number
): Map {
  const radiusCircle = circle([lng, lat], radiusSize, {
    properties: { foo: "bar" },
    steps: 26,
    units: "feet"
  });

  const radiusSource = map.getSource(CURRENT_LOCATION_RADIUS) as
    | GeoJSONSource
    | undefined;
  if (!radiusSource) {
    map.addSource(CURRENT_LOCATION_RADIUS, {
      type: "geojson",
      data: radiusCircle
    });
  } else {
    radiusSource.setData(radiusCircle);
  }

  if (!map.getLayer(CURRENT_LOCATION_RADIUS_LAYER)) {
    map.addLayer({
      id: CURRENT_LOCATION_RADIUS_LAYER,
      type: "fill",
      source: CURRENT_LOCATION_RADIUS,
      paint: {
        "fill-color": "#888888",
        "fill-opacity": 0.4
      }
    });
  }

  return map;
}

export function setCurrentLocationMarker(
  map: Map,
  lng: number,
  lat: number,
  radiusSize: number
): Map {
  const data = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Point" as const,
      coordinates: [lng, lat]
    }
  };
  const currentLocationSource = map.getSource(
    CURRENT_LOCATION_CIRCLE
  ) as GeoJSONSource | undefined;
  if (!currentLocationSource) {
    map.addSource(CURRENT_LOCATION_CIRCLE, {
      type: "geojson",
      data
    });
  } else {
    currentLocationSource.setData(data);
  }

  if (!map.getLayer(CURRENT_LOCATION_CIRCLE_LAYER)) {
    map.addLayer({
      id: CURRENT_LOCATION_CIRCLE_LAYER,
      type: "circle",
      source: CURRENT_LOCATION_CIRCLE
    });
  }

  return drawCircle(map, lng, lat, radiusSize);
}

export function initializeCurrentLocationMarker(
  map: Map,
  lng: number,
  lat: number,
  radiusSize: number
) {
  let updatedMap = map;
  map.on("load", () => {
    updatedMap = setCurrentLocationMarker(map, lng, lat, radiusSize);
  });

  return updatedMap;
}
