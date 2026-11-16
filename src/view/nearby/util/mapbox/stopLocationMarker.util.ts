// @ts-ignore
// tslint:disable-next-line:no-implicit-dependencies
import mapboxgl, { Map } from "!mapbox-gl";
import { MapLayerMouseEvent } from "mapbox-gl";
import { map } from "lodash";
import { StopLocationsDictionary } from "../../../../store/reducers/util/formatStopLocations";
import { ArrivalLocation } from "../../../../api/trimet/interfaces/arrivals";
import {
  STOP_LOCATION_LAYER,
  STOP_LOCATIONS_SOURCE,
  CURRENT_LOCATION_CIRCLE_LAYER,
  CURRENT_LOCATION_CIRCLE,
  CURRENT_LOCATION_RADIUS_LAYER,
  CURRENT_LOCATION_RADIUS
} from "./consts";

const stopHoverControls = new WeakMap<Map, {
  dispose: () => void;
  highlight: (stopId?: number) => void;
}>();

const STOP_DETAIL_MARKER = "stop-detail-marker";

export function showStopDetailMarker(mapBoxMap: Map, stop: ArrivalLocation) {
  mapBoxMap.addSource(STOP_DETAIL_MARKER, {
    type: "geojson",
    data: {
      type: "Feature",
      geometry: { type: "Point", coordinates: [stop.lng, stop.lat] },
      properties: { locid: stop.id }
    }
  });
  try {
    mapBoxMap.addLayer({
      id: STOP_DETAIL_MARKER,
      type: "circle",
      source: STOP_DETAIL_MARKER,
      paint: {
        "circle-color": "#ff0000",
        "circle-emissive-strength": 1,
        "circle-radius": 8,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2
      }
    });
  } catch (error) {
    mapBoxMap.removeSource(STOP_DETAIL_MARKER);
    throw error;
  }
  return () => {
    if (mapBoxMap.getLayer(STOP_DETAIL_MARKER)) mapBoxMap.removeLayer(STOP_DETAIL_MARKER);
    if (mapBoxMap.getSource(STOP_DETAIL_MARKER)) mapBoxMap.removeSource(STOP_DETAIL_MARKER);
  };
}

export function removeStopLocationLayers(mapBoxMap: Map) {
  stopHoverControls.get(mapBoxMap)?.dispose();
  stopHoverControls.delete(mapBoxMap);
  let map = mapBoxMap;
  console.log("removing stop location layers");
  if (mapBoxMap.getLayer(STOP_LOCATION_LAYER)) {
    map = mapBoxMap.removeLayer(STOP_LOCATION_LAYER);
  }

  if (mapBoxMap.getSource(STOP_LOCATIONS_SOURCE)) {
    map = mapBoxMap.removeSource(STOP_LOCATIONS_SOURCE);
  }

  return map;
}

export function removeCurrentLocationMarkers(mapBoxMap: Map) {
  console.log("removing current location markers");
  if (mapBoxMap.getLayer(CURRENT_LOCATION_CIRCLE_LAYER)) {
    mapBoxMap.removeLayer(CURRENT_LOCATION_CIRCLE_LAYER);
  }

  if (mapBoxMap.getSource(CURRENT_LOCATION_CIRCLE)) {
    mapBoxMap.removeSource(CURRENT_LOCATION_CIRCLE);
  }

  if (mapBoxMap.getLayer(CURRENT_LOCATION_RADIUS_LAYER)) {
    mapBoxMap.removeLayer(CURRENT_LOCATION_RADIUS_LAYER);
  }

  if (mapBoxMap.getSource(CURRENT_LOCATION_RADIUS)) {
    mapBoxMap.removeSource(CURRENT_LOCATION_RADIUS);
  }
}

export function setNearbyStops(
  mapBoxMap: Map,
  stopLocations: StopLocationsDictionary,
  routeIds: string[],
  handleStopMarkerClick: (data: any) => void
) {
  const isLoaded = mapBoxMap?.loaded();
  console.log("is map loaded", isLoaded);
  console.log("setting nearby stops", stopLocations, routeIds);

  const features = map(stopLocations, stopLocation => {
    return {
      geometry: {
        type: "Point",
        coordinates: [stopLocation.lng, stopLocation.lat]
      },
      properties: {
        locid: stopLocation.locid,
        routeids: routeIds.join(",") // Ensure routeids are included
      },
      type: "Feature"
    };
  });

  mapBoxMap.addSource(STOP_LOCATIONS_SOURCE, {
    data: {
      type: "FeatureCollection",
      // @ts-ignore
      features
    },
    type: "geojson"
  });

  mapBoxMap.addLayer({
    id: STOP_LOCATION_LAYER,
    paint: {
      "circle-color": "#4264fb",
      "circle-emissive-strength": 1,
      "circle-radius": 8,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2
    },
    source: STOP_LOCATIONS_SOURCE,
    type: "circle"
  });

  function handleClick(e: MapLayerMouseEvent) {
    const feature = e.features?.[0];
    if (feature?.geometry.type !== "Point") {
      return;
    }
    mapBoxMap.flyTo({
      center: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]]
    });
    mapBoxMap.setZoom(16);
    handleStopMarkerClick(feature);
  }

  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
  });
  let highlightedStop: number | undefined;
  let hoveredMapStop: number | undefined;
  let hoveredLongitude: number;

  function showPopup() {
    const id = hoveredMapStop ?? highlightedStop;
    const stop = id === undefined ? undefined : stopLocations[id];
    if (!stop) {
      popup.remove();
      return;
    }
    const coordinates: [number, number] = [stop.lng, stop.lat];
    const longitude = hoveredMapStop === undefined
      ? mapBoxMap.getCenter().lng : hoveredLongitude;

    while (Math.abs(longitude - coordinates[0]) > 180) {
      coordinates[0] += longitude > coordinates[0] ? 360 : -360;
    }

    const popupHtml = `<strong>Stop ID</strong>: ${stop.locid}<br><strong>Routes</strong>: ${routeIds.join(", ")}`;
    popup
      .setLngLat(coordinates)
      .setHTML(popupHtml)
      .addTo(mapBoxMap);
  }

  function handleMouseEnter(e: MapLayerMouseEvent) {
    mapBoxMap.getCanvas().style.cursor = "pointer";
    hoveredMapStop = Number(e.features?.[0]?.properties.locid);
    hoveredLongitude = e.lngLat.lng;
    showPopup();
  }

  function handleMouseLeave() {
    mapBoxMap.getCanvas().style.cursor = "";
    hoveredMapStop = undefined;
    showPopup();
  }

  mapBoxMap.on("click", STOP_LOCATION_LAYER, handleClick);
  mapBoxMap.on("mouseenter", STOP_LOCATION_LAYER, handleMouseEnter);
  mapBoxMap.on("mouseleave", STOP_LOCATION_LAYER, handleMouseLeave);
  stopHoverControls.set(mapBoxMap, {
    dispose: () => {
      popup.remove();
      mapBoxMap.getCanvas().style.cursor = "";
      mapBoxMap.off("click", STOP_LOCATION_LAYER, handleClick);
      mapBoxMap.off("mouseenter", STOP_LOCATION_LAYER, handleMouseEnter);
      mapBoxMap.off("mouseleave", STOP_LOCATION_LAYER, handleMouseLeave);
    },
    highlight: (stopId?: number) => {
      highlightedStop = stopId;
      showPopup();
    }
  });

  return mapBoxMap;
}

export function highlightNearbyStop(mapBoxMap: Map, stopId?: number) {
  updateStopMarkerColor(mapBoxMap, stopId === undefined ? undefined : String(stopId), "#ff0000");
  stopHoverControls.get(mapBoxMap)?.highlight(stopId);
}

export function updateStopMarkerColor(
  mapBoxMap: Map,
  stopId: string | undefined,
  color: string
) {
  if (!mapBoxMap?.getLayer(STOP_LOCATION_LAYER)) {
    return;
  }
  mapBoxMap.setPaintProperty(STOP_LOCATION_LAYER, "circle-color",
    stopId === undefined ? "#4264fb" : [
      "case",
      ["==", ["get", "locid"], parseInt(stopId, 10)],
      color,
      "#4264fb"
    ]);
}
