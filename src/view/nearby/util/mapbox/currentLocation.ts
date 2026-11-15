import circle from "@turf/circle";
import { GeoJSONSource, Map } from "mapbox-gl";
import {
  CURRENT_LOCATION_CIRCLE,
  CURRENT_LOCATION_CIRCLE_LAYER,
  CURRENT_LOCATION_RADIUS,
  CURRENT_LOCATION_RADIUS_LAYER
} from "./consts";

/**
 * Draws a circle radius around a location on the map.
 * Creates or updates the radius source and layer to visualize a circular area.
 * 
 * @param map - The Mapbox GL map instance
 * @param lng - Longitude of the circle center
 * @param lat - Latitude of the circle center
 * @param radiusSize - Radius size in feet
 * @returns The updated map instance
 */
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

/**
 * Sets the current location marker on the map with a radius circle.
 * Creates or updates both the location point marker and surrounding radius.
 * 
 * @param map - The Mapbox GL map instance
 * @param lng - Longitude of the location
 * @param lat - Latitude of the location
 * @param radiusSize - Radius size in feet for the surrounding circle
 * @returns The updated map instance with marker and radius
 */
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

/**
 * Initializes the current location marker when the map loads.
 * Waits for the map 'load' event before adding the location marker.
 * 
 * @param map - The Mapbox GL map instance
 * @param lng - Longitude of the location
 * @param lat - Latitude of the location
 * @param radiusSize - Radius size in feet for the surrounding circle
 * @returns The map instance (note: actual update happens asynchronously on load)
 */
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
