import { each, map } from "lodash";
import mapboxgl from "mapbox-gl";
import { StopLocation } from "../../../api/trimet/interfaces/types";
import { StopLocationsDictionary } from "../../../store/reducers/util/formatStopLocations";
import { RouteDirectionDict } from "../../../store/reducers/util/getRoutesFromStopLocations";
import { NearbyRoutesDictionary } from "../../../store/reducers/view/nearbyRoutesViewReducer";
import { LatLngCoords } from "../components/NearbyMap";

export function mountMapCenteredOnLocation(
  mapContainer,
  currentLocation: LatLngCoords
) {
  return new mapboxgl.Map({
    // @ts-ignore
    center: currentLocation,
    container: mapContainer,
    style: "mapbox://styles/mapbox/streets-v9",
    zoom: 15.25
  });
}

export function setCurrentLocationMarker(
  mapBoxMap,
  currentLocation: LatLngCoords
) {
  if (currentLocation) {
    mapBoxMap.addLayer({
      id: "currentlocation",
      layout: {
        "icon-image": "rocket-15"
      },
      source: {
        data: {
          features: [
            {
              geometry: {
                coordinates: currentLocation,
                type: "Point"
              },
              properties: {},
              type: "Feature"
            }
          ],
          type: "FeatureCollection"
        },
        type: "geojson"
      },
      type: "symbol"
    });
  }
}

export function setLocations(stopLocations: StopLocationsDictionary) {
  return map(stopLocations, (stopLocation: StopLocation) => {
    return {
      geometry: {
        coordinates: [stopLocation.lng, stopLocation.lat],
        type: "Point"
      },
      properties: {},
      type: "Feature"
    };
  });
}

export function setNearbyStopMarkers(
  mapBoxMap,
  stopLocations: StopLocationsDictionary
) {
  mapBoxMap.addLayer({
    id: "symbols",
    layout: {
      "icon-image": "bus-15"
    },
    source: {
      data: {
        features: setLocations(stopLocations),
        type: "FeatureCollection"
      },
      type: "geojson"
    },
    type: "symbol"
  });

  // Center the map on the coordinates of any clicked symbol from the 'symbols' layer.
  mapBoxMap.on("click", "symbols", e => {
    mapBoxMap.flyTo({ center: e.features[0].geometry.coordinates });
  });

  // Change the cursor to a pointer when the it enters a feature in the 'symbols' layer.
  mapBoxMap.on("mouseenter", "symbols", () => {
    mapBoxMap.getCanvas().style.cursor = "pointer";
  });

  // Change it back to a pointer when it leaves.
  mapBoxMap.on("mouseleave", "symbols", () => {
    mapBoxMap.getCanvas().style.cursor = "";
  });
}

function getRouteGeometry(routeId: string, directionId: number) {
  return import(
    `../../../data/${routeId}/${routeId}_${directionId}.json`
  ).catch(e => {
    return e;
  });
}

function addMapboxLayer(mapBoxMap, routeIdentifier: string, promise) {
  mapBoxMap.addLayer({
    id: routeIdentifier,
    source: {
      data: {
        geometry: promise.geometry,
        type: "Feature"
      },
      type: "geojson"
    },
    type: "line"
  });
}

function addRouteLayers(mapBoxMap, returnedPromises: any[]) {
  each(returnedPromises, promise => {
    if (!promise.code) {
      const { route_number, direction } = promise.properties;
      const routeIdentifier = `${route_number}_${direction}`;

      addMapboxLayer(mapBoxMap, routeIdentifier, promise);
    }
  });
}

export function setRoutes(mapBoxMap, nearbyRouteIds: NearbyRoutesDictionary) {
  const promises = [];

  each(nearbyRouteIds, (route, routeId) => {
    each(route.directions, directionId => {
      const promise = getRouteGeometry(routeId, directionId);
      promises.push(promise);
    });
  });

  Promise.all(promises)
    .then((returnedPromises: any[]) => {
      addRouteLayers(mapBoxMap, returnedPromises);
    })
    .catch(err => {
      // tslint:disable
      console.error(err);
    });
}
