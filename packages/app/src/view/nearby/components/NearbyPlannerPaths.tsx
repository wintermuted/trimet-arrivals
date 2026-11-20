import React, { useEffect, useId, useMemo, useState } from "react";
import { LngLatBounds, Map as MapboxMap, MapMouseEvent, Marker, Popup } from "mapbox-gl";
import { TripPlannerItinerary } from "../../../api/trimet/tripplanner";
import { PlannerRouteColors } from "../../../api/trimet/plannerRouteColors";
import { loadPlannerPaths } from "../util/mapbox/plannerPaths";
import { Button } from "@wintermuted/ui-theme/react";
import { TripCorridor } from "@trimet-arrivals/places/discovery";

const SOURCE = "planner-itineraries";
const OTHER = `${SOURCE}-alternatives`;
const CASING = `${SOURCE}-selected-casing`;
const ACTIVE = `${SOURCE}-selected`;
const OTHER_WALK = `${OTHER}-walk`;
const ACTIVE_WALK = `${ACTIVE}-walk`;
const HIGHLIGHT = `${ACTIVE}-highlight`;
const HIGHLIGHT_WALK = `${HIGHLIGHT}-walk`;

function itineraryStops(itinerary: TripPlannerItinerary) {
  const stops = new Map<number, {
    id: number;
    name: string;
    point: [number, number];
    actions: Set<string>;
    board: boolean;
    exit: boolean;
  }>();
  for (const leg of itinerary.legs) {
    if (leg.mode?.toLowerCase() === "walk") continue;
    for (const [action, stop] of [["board", leg.from], ["exit", leg.to]] as const) {
      if (!stop?.stopId || !Number.isFinite(stop.lon) || !Number.isFinite(stop.lat) ||
          Math.abs(stop.lon) > 180 || Math.abs(stop.lat) > 90) continue;
      if (!stops.has(stop.stopId)) {
        stops.set(stop.stopId, {
          id: stop.stopId, name: stop.description || `Stop ${stop.stopId}`,
          point: [stop.lon, stop.lat], actions: new Set(), board: false, exit: false
        });
      }
      const marker = stops.get(stop.stopId);
      marker[action] = true;
      const route = leg.route?.name || leg.route?.number || leg.mode;
      marker.actions.add(`${action === "board" ? "Board" : "Get off"}${route ? `: ${route}` : ""}`);
    }
  }
  return Array.from(stops.values());
}

export default function NearbyPlannerPaths({ map: plannerMap, suspended, itineraries, selected, previewTrip, walkingEnabled, highlightedLeg, onMapLeg, routeColors, onDiscoverPlaces }: {
  map?: MapboxMap;
  suspended?: boolean;
  itineraries: TripPlannerItinerary[];
  selected: number;
  previewTrip?: number;
  walkingEnabled: boolean;
  highlightedLeg?: number;
  onMapLeg: (leg?: number) => void;
  routeColors?: PlannerRouteColors;
  onDiscoverPlaces?: (corridor: Pick<TripCorridor, "lines" | "incomplete">) => void;
}) {
  const map = suspended ? undefined : plannerMap;
  const includeWalking = walkingEnabled && Boolean(plannerMap);
  const [loaded, setLoaded] = useState<{
    itineraries: TripPlannerItinerary[];
    includeWalking: boolean;
    routeColors?: PlannerRouteColors;
    paths: Awaited<ReturnType<typeof loadPlannerPaths>>;
  }>();
  const result = loaded?.itineraries === itineraries && loaded.includeWalking === includeWalking && loaded.routeColors === routeColors
    ? loaded.paths : undefined;
  const emphasizedTrip = previewTrip !== undefined && result?.data.features.some(({ properties }) => properties.trip === previewTrip)
    ? previewTrip : selected;
  const emphasizedLeg = emphasizedTrip === selected ? highlightedLeg : undefined;
  const [mapError, setMapError] = useState(false);
  const mapEmphasis = React.useRef(emphasizedTrip);
  const mapHighlight = React.useRef(emphasizedLeg);
  const applySelection = React.useRef<() => void>();
  const stopsByTrip = useMemo(() => itineraries.map(itineraryStops), [itineraries]);
  const selectedStops = stopsByTrip[selected];
  const popupIdPrefix = useId();
  const lastFit = React.useRef<{ map: MapboxMap; result: typeof result }>();
  const suspendedInputs = React.useRef<{ itineraries: TripPlannerItinerary[]; includeWalking: boolean; routeColors?: PlannerRouteColors }>();
  useEffect(() => {
    if (suspended) suspendedInputs.current = { itineraries, includeWalking, routeColors };
  }, [suspended, itineraries, includeWalking, routeColors]);

  useEffect(() => {
    if (!map || !selectedStops?.length) return;
    let activePopup: Popup | undefined;
    const markers = selectedStops.map(stop => {
      const element = document.createElement("button");
      element.type = "button";
      element.setAttribute("role", "button");
      element.className = "transit-planner-stop-marker";
      element.setAttribute("aria-label", Array.from(stop.actions).map(action => `${action} at ${stop.name}`).join("; "));
      element.setAttribute("aria-expanded", "false");
      element.textContent = stop.board && stop.exit ? "↕" : stop.board ? "↑" : "↓";
      const content = document.createElement("div");
      content.id = `${popupIdPrefix}-trip-stop-${stop.id}`;
      const title = document.createElement("strong");
      title.textContent = stop.name;
      const id = document.createElement("small");
      id.textContent = `Stop ID: ${stop.id}`;
      const actions = document.createElement("ul");
      stop.actions.forEach(action => {
        const row = document.createElement("li");
        row.textContent = action;
        actions.appendChild(row);
      });
      content.append(title, id, actions);
      const popup = new Popup({
        className: "transit-planner-stop-popup", closeButton: false, focusAfterOpen: false, offset: 15,
      }).setLngLat(stop.point).setDOMContent(content);
      popup.on("close", () => {
        element.setAttribute("aria-expanded", "false");
        element.removeAttribute("aria-controls");
        if (activePopup === popup) activePopup = undefined;
      });
      element.addEventListener("click", event => {
        event.stopPropagation();
        if (popup.isOpen()) {
          popup.remove();
          return;
        }
        activePopup?.remove();
        activePopup = popup.addTo(map);
        element.setAttribute("aria-expanded", "true");
        element.setAttribute("aria-controls", content.id);
      });
      element.addEventListener("keydown", event => {
        if (event.key === "Escape" && popup.isOpen()) {
          event.stopPropagation();
          popup.remove();
        }
      });
      return new Marker({ element }).setLngLat(stop.point).addTo(map);
    });
    return () => {
      activePopup?.remove();
      markers.forEach(marker => marker.remove());
    };
  }, [map, selectedStops, popupIdPrefix]);

  useEffect(() => {
    mapEmphasis.current = emphasizedTrip;
    mapHighlight.current = emphasizedLeg;
    applySelection.current?.();
  }, [emphasizedTrip, emphasizedLeg]);

  useEffect(() => {
    const controller = new AbortController();
    void loadPlannerPaths(itineraries, controller.signal, includeWalking, routeColors).then(paths => {
      if (!controller.signal.aborted) setLoaded({ itineraries, includeWalking, routeColors, paths });
    });
    return () => controller.abort();
  }, [itineraries, includeWalking, routeColors]);

  useEffect(() => {
    if (!map || !result?.data.features.length) return;
    const { data } = result;
    function installLayers() {
      if (map.getSource(SOURCE)) return;
      try {
        map.addSource(SOURCE, { type: "geojson", data });
        const layout = { "line-cap": "round", "line-join": "round" } as const;
        map.addLayer({
          id: OTHER, source: SOURCE, type: "line", slot: "top", layout,
          paint: { "line-color": ["get", "color"], "line-width": 3.5, "line-opacity": 0.6, "line-emissive-strength": 1 }
        });
        map.addLayer({
          id: OTHER_WALK, source: SOURCE, type: "line", slot: "top", layout,
          paint: { "line-color": "#667b92", "line-width": 3, "line-dasharray": [1, 2], "line-emissive-strength": 1 }
        });
        map.addLayer({
          id: CASING, source: SOURCE, type: "line", slot: "top", layout,
          paint: { "line-color": "#f8fbff", "line-width": 9, "line-emissive-strength": 1 }
        });
        map.addLayer({
          id: ACTIVE, source: SOURCE, type: "line", slot: "top", layout,
          paint: { "line-color": ["get", "color"], "line-width": 5, "line-emissive-strength": 1 }
        });
        map.addLayer({
          id: ACTIVE_WALK, source: SOURCE, type: "line", slot: "top", layout,
          paint: { "line-color": "#1559d1", "line-width": 4, "line-dasharray": [1, 2], "line-emissive-strength": 1 }
        });
        map.addLayer({
          id: HIGHLIGHT, source: SOURCE, type: "line", slot: "top", layout,
          paint: { "line-color": ["get", "color"], "line-width": 8, "line-emissive-strength": 1 }
        });
        map.addLayer({
          id: HIGHLIGHT_WALK, source: SOURCE, type: "line", slot: "top", layout,
          paint: { "line-color": "#1559d1", "line-width": 7, "line-dasharray": [4 / 7, 8 / 7], "line-emissive-strength": 1 }
        });
        updateSelection();
        setMapError(false);
      } catch {
        removeLayers();
        setMapError(true);
      }
    }

    function updateSelection() {
      if (!map.getLayer(ACTIVE)) return;
      const trip = mapEmphasis.current;
      const filter = (layer: string, operator: "==" | "!=", walk: boolean) =>
        map.setFilter(layer, ["all", [operator, ["get", "trip"], trip], ["==", ["get", "walk"], walk]]);
      filter(OTHER, "!=", false);
      filter(OTHER_WALK, "!=", true);
      filter(CASING, "==", false);
      filter(ACTIVE, "==", false);
      filter(ACTIVE_WALK, "==", true);
      for (const [layer, walk] of [[HIGHLIGHT, false], [HIGHLIGHT_WALK, true]] as const) {
        map.setFilter(layer, ["all",
          ["==", ["get", "trip"], trip],
          ["==", ["get", "legIndex"], mapHighlight.current ?? -1],
          ["==", ["get", "walk"], walk]
        ]);
      }
    }

    function removeLayers() {
      [HIGHLIGHT_WALK, HIGHLIGHT, ACTIVE_WALK, ACTIVE, CASING, OTHER_WALK, OTHER].forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource(SOURCE)) map.removeSource(SOURCE);
    }

    installLayers();
    map.on("style.load", installLayers);
    applySelection.current = updateSelection;
    return () => {
      applySelection.current = undefined;
      map.off("style.load", installLayers);
      removeLayers();
    };
  }, [map, result]);

  useEffect(() => {
    onMapLeg();
    if (!map || !result?.data.features.length || selected < 0) return;
    const move = ({ point }: MapMouseEvent) => {
      const layers = [ACTIVE, ACTIVE_WALK].filter(id => map.getLayer(id));
      if (!layers.length) return onMapLeg();
      const features = map.queryRenderedFeatures(point, { layers });
      let firstLeg: number | undefined;
      for (const { properties } of features) {
        const leg = properties?.legIndex;
        if (properties?.trip === selected && Number.isInteger(leg) &&
            (firstLeg === undefined || leg < firstLeg)) {
          firstLeg = leg;
        }
      }
      onMapLeg(firstLeg);
    };
    const leave = () => onMapLeg();
    map.on("mousemove", move);
    map.on("mouseout", leave);
    map.on("dragstart", leave);
    return () => {
      map.off("mousemove", move);
      map.off("mouseout", leave);
      map.off("dragstart", leave);
    };
  }, [map, result, selected, onMapLeg]);

  useEffect(() => {
    if (!map || !result) return;
    if (lastFit.current?.map === map && lastFit.current.result === result) return;
    lastFit.current = { map, result };
    const previous = suspendedInputs.current;
    suspendedInputs.current = undefined;
    if (previous?.itineraries === itineraries && previous.includeWalking === includeWalking &&
        previous.routeColors === routeColors) return;
    const bounds = new LngLatBounds();
    const points = stopsByTrip.flatMap(stops => stops.map(stop => stop.point));
    result.data.features.forEach(({ geometry }) => {
      const lines = geometry.type === "LineString" ? [geometry.coordinates] : geometry.coordinates;
      lines.forEach(line => line.forEach(([lng, lat]) => points.push([lng, lat])));
    });
    if (!points.length) return;
    points.forEach(point => bounds.extend(point));
    const { clientWidth, clientHeight } = map.getContainer();
    const padding = Math.floor(Math.min(44, clientWidth / 6, clientHeight / 6));
    map.fitBounds(bounds, { padding, maxZoom: 16, duration: 0 });
  }, [map, result, stopsByTrip, itineraries, includeWalking, routeColors]);

  const selectedPaths = result?.data.features.filter(feature => feature.properties.trip === selected) || [];
  return <>
    {mapError && <small role="alert">Trip paths could not be displayed.</small>}
    {onDiscoverPlaces && selected >= 0 && <div className="transit-planner-places">
      <Button size="sm" variant="secondary" disabled={!selectedPaths.length} onClick={() => onDiscoverPlaces({
        lines: selectedPaths.flatMap(({ geometry }) => geometry.type === "LineString" ? [geometry.coordinates] : geometry.coordinates),
        incomplete: new Set(selectedPaths.map(feature => feature.properties.legIndex)).size < itineraries[selected].legs.length
      })}>Places along this trip</Button>
      {!selectedPaths.length && <p role="status">Mapped trip geometry is not available yet. Walking-only trips need walking routes enabled.</p>}
    </div>}
  </>;
}
