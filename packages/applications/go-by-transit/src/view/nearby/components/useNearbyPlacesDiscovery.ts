import { RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LngLatBounds, Map } from "mapbox-gl";
import { useLocation, useNavigate } from "react-router-dom";
import { DEFAULT_PLACE_FILTERS, filterPlaces, placeCategoryForId, placeDetailLink, placeInBounds, PlaceFilters, usePlaceCatalog } from "@overworld/places/catalog";
import { useNeighborhoods } from "@overworld/places/neighborhoods";
import { DEFAULT_LINE_OVERLAYS, LineOverlayCategory, useLineOverlay } from "@overworld/places/lineOverlays";
import { ContextCategory, DEFAULT_CONTEXT_OVERLAYS, useContextOverlay } from "@overworld/places/contextOverlays";
import { placesViewSearch, PlacesView, PlacesViewport, readPlacesView, TripCorridor, tripCorridorMatcher } from "@overworld/places/discovery";
import { useSavedPlaces } from "@overworld/places/savedPlaces";
import { SERVICE_AREA_CENTER } from "./nearbyViewSettings";

export default function useNearbyPlacesDiscovery(
  mapRef: RefObject<Map | null>,
  isMapLoaded: boolean,
  isPlaces: boolean,
  selectedPlaceId?: string
) {
  const location = useLocation();
  const navigate = useNavigate();
  const sharedPlacesView = useMemo(() => readPlacesView(location.search), [location.search]);
  const lastSharedSearch = useRef(location.search);

  const placeCatalog = usePlaceCatalog(isPlaces);
  const [placeFilters, setPlaceFilters] = useState<PlaceFilters>(sharedPlacesView.view?.filters ?? DEFAULT_PLACE_FILTERS);
  const savedPlaces = useSavedPlaces();
  const [savedOnly, setSavedOnly] = useState(false);
  const [tripCorridor, setTripCorridor] = useState<TripCorridor>();
  const [alongTrip, setAlongTrip] = useState(false);
  const [tripDistance, setTripDistance] = useState(500);
  const [tripMapError, setTripMapError] = useState(false);
  const [tripMapRevision, setTripMapRevision] = useState(0);
  const fitTrip = useRef(false);
  const [placeBounds, setPlaceBounds] = useState<[number, number, number, number]>();
  const [placeZoom, setPlaceZoom] = useState(0);
  const [placeMapError, setPlaceMapError] = useState(false);
  const [placeMapRevision, setPlaceMapRevision] = useState(0);
  const [neighborhoodsShown, setNeighborhoodsShown] = useState(sharedPlacesView.view?.neighborhoods ?? false);
  const [neighborhoodPolygonsShown, setNeighborhoodPolygonsShown] = useState(sharedPlacesView.view?.polygons ?? false);
  const neighborhoods = useNeighborhoods(isPlaces && neighborhoodsShown);
  const [neighborhoodMapError, setNeighborhoodMapError] = useState(false);
  const [neighborhoodLayerRevision, setNeighborhoodLayerRevision] = useState(0);
  const [lineOverlaysShown, setLineOverlaysShown] = useState(sharedPlacesView.view?.lines ?? DEFAULT_LINE_OVERLAYS);
  const [lineOverlayErrors, setLineOverlayErrors] = useState(DEFAULT_LINE_OVERLAYS);
  const [lineOverlayRevisions, setLineOverlayRevisions] = useState({
    "park-trails": 0, "bicycle-network": 0, "recommended-bike-routes": 0
  });
  const lineOverlaySources = {
    "park-trails": useLineOverlay("park-trails", isPlaces && lineOverlaysShown["park-trails"]),
    "bicycle-network": useLineOverlay("bicycle-network", isPlaces && lineOverlaysShown["bicycle-network"]),
    "recommended-bike-routes": useLineOverlay("recommended-bike-routes", isPlaces && lineOverlaysShown["recommended-bike-routes"])
  };
  const handleLineOverlayError = useCallback((category: LineOverlayCategory, error: boolean) =>
    setLineOverlayErrors(previous => previous[category] === error ? previous : { ...previous, [category]: error }), []);
  const [contextShown, setContextShown] = useState(sharedPlacesView.view?.context ?? DEFAULT_CONTEXT_OVERLAYS);
  const [contextErrors, setContextErrors] = useState(DEFAULT_CONTEXT_OVERLAYS);
  const [contextRevisions, setContextRevisions] = useState({
    "street-trees": 0, sidewalks: 0, crossings: 0, "crossing-deficiencies": 0
  });
  const contextSources = {
    "street-trees": useContextOverlay("street-trees", isPlaces && contextShown["street-trees"], placeBounds, placeZoom),
    sidewalks: useContextOverlay("sidewalks", isPlaces && contextShown.sidewalks, placeBounds, placeZoom),
    crossings: useContextOverlay("crossings", isPlaces && contextShown.crossings, placeBounds, placeZoom),
    "crossing-deficiencies": useContextOverlay("crossing-deficiencies", isPlaces && contextShown["crossing-deficiencies"], placeBounds, placeZoom)
  };
  const handleContextError = useCallback((category: ContextCategory, error: boolean) =>
    setContextErrors(previous => previous[category] === error ? previous : { ...previous, [category]: error }), []);
  const [coincidentIds, setCoincidentIds] = useState<string[]>([]);
  const placeViewport = useRef<PlacesViewport>(sharedPlacesView.viewport);
  const nearTrip = useMemo(() => tripCorridor && alongTrip
    ? tripCorridorMatcher(tripCorridor.lines, tripDistance) : undefined, [tripCorridor, alongTrip, tripDistance]);
  const filteredPlaces = useMemo(() => filterPlaces(placeCatalog.places, placeFilters, !savedOnly)
    .filter(place => (!savedOnly || Boolean(savedPlaces.saved[place.id])) && (!nearTrip || nearTrip(place.coordinates))),
    [placeCatalog.sources, placeFilters, savedOnly, savedPlaces.saved, nearTrip]);
  const visiblePlaces = useMemo(() => savedOnly || nearTrip ? filteredPlaces : placeBounds
    ? filteredPlaces.filter(place => placeInBounds(place, placeBounds)) : [], [filteredPlaces, placeBounds, savedOnly, nearTrip]);
  const placesScope: "trip corridor" | "saved view" | "map area" =
    nearTrip ? "trip corridor" : savedOnly ? "saved view" : "map area";
  const currentPlacesView: PlacesView = { filters: placeFilters, neighborhoods: neighborhoodsShown,
    polygons: neighborhoodPolygonsShown, lines: lineOverlaysShown, context: contextShown };
  const shareSearch = placesViewSearch(currentPlacesView, placeViewport.current);
  const retainedViewSearch = sharedPlacesView.view ? shareSearch : "";
  const unavailableSaved = useMemo(() => {
    if (!Object.values(placeCatalog.sources).every(source => source.snapshot && !source.error)) return [];
    const ids = new Set(placeCatalog.places.map(place => place.id));
    return Object.entries(savedPlaces.saved).filter(([id]) => !ids.has(id));
  }, [placeCatalog.sources, savedPlaces.saved]);
  function applyPlacesView(view: PlacesView) {
    setPlaceFilters(view.filters);
    setNeighborhoodsShown(view.neighborhoods);
    setNeighborhoodPolygonsShown(view.polygons);
    setLineOverlaysShown(view.lines);
    setContextShown(view.context);
  }
  useEffect(() => {
    if (!isPlaces || lastSharedSearch.current === location.search) return;
    lastSharedSearch.current = location.search;
    if (!sharedPlacesView.view) return;
    applyPlacesView(sharedPlacesView.view);
    if (sharedPlacesView.viewport) {
      placeViewport.current = sharedPlacesView.viewport;
      if (!selectedPlaceId) mapRef.current?.jumpTo(sharedPlacesView.viewport);
    }
  }, [isPlaces, location.search, sharedPlacesView, selectedPlaceId]);
  const selectedPlace = placeCatalog.places.find(place => place.id === selectedPlaceId);
  const selectedCategory = placeCategoryForId(selectedPlaceId || "");
  const selectedSource = selectedCategory ? placeCatalog.sources[selectedCategory] : undefined;
  const mappedPlaces = useMemo(() => selectedPlace && !filteredPlaces.some(place => place.id === selectedPlace.id)
    ? [...filteredPlaces, selectedPlace] : filteredPlaces, [filteredPlaces, selectedPlace]);
  useEffect(() => {
    setCoincidentIds([]);
  }, [placeFilters, selectedPlaceId, isPlaces]);
  const selectPlace = useCallback((id?: string) => {
    setCoincidentIds([]);
    navigate(id ? placeDetailLink(id, retainedViewSearch) : `/nearby/places${retainedViewSearch}`);
  }, [navigate, retainedViewSearch]);
  const discoverPlacesAlongTrip = useCallback((trip: TripCorridor) => {
    setTripCorridor(trip);
    setAlongTrip(true);
    fitTrip.current = true;
    navigate("/nearby/places");
  }, [navigate]);
  const updatePlaceBounds = useCallback((bounds: [number, number, number, number]) => {
    setPlaceBounds(bounds);
    const map = mapRef.current;
    if (map) setPlaceZoom(map.getZoom());
    if (map && !selectedPlaceId) {
      const center = map.getCenter();
      placeViewport.current = { center: [center.lng, center.lat], zoom: map.getZoom() };
    }
  }, [selectedPlaceId]);
  useLayoutEffect(() => {
    if (isPlaces && isMapLoaded) {
      if (selectedPlace) mapRef.current?.jumpTo({ center: selectedPlace.coordinates, zoom: 15 });
      else if (!selectedPlaceId && fitTrip.current && tripCorridor) {
        const bounds = new LngLatBounds();
        tripCorridor.lines.forEach(line => line.forEach(([lng, lat]) => bounds.extend([lng, lat])));
        mapRef.current?.fitBounds(bounds, { padding: 32, maxZoom: 14, duration: 0 });
        fitTrip.current = false;
      } else if (!selectedPlaceId) mapRef.current?.jumpTo(placeViewport.current ?? { center: SERVICE_AREA_CENTER, zoom: 12 });
    }
  }, [isPlaces, isMapLoaded, selectedPlaceId, selectedPlace, tripCorridor]);
  return {
    sharedPlacesView, placeCatalog, placeFilters, setPlaceFilters, savedPlaces,
    savedOnly, setSavedOnly, tripCorridor, alongTrip, setAlongTrip, tripDistance,
    setTripDistance, tripMapError, setTripMapError, tripMapRevision, setTripMapRevision,
    placeBounds, placeMapError, setPlaceMapError, placeMapRevision, setPlaceMapRevision,
    neighborhoodsShown, setNeighborhoodsShown, neighborhoodPolygonsShown, setNeighborhoodPolygonsShown,
    neighborhoods, neighborhoodMapError, setNeighborhoodMapError, neighborhoodLayerRevision,
    setNeighborhoodLayerRevision, lineOverlaysShown, setLineOverlaysShown, lineOverlayErrors,
    lineOverlayRevisions, setLineOverlayRevisions, lineOverlaySources, handleLineOverlayError,
    contextShown, setContextShown, contextErrors, contextRevisions, setContextRevisions,
    contextSources, handleContextError, coincidentIds, setCoincidentIds, visiblePlaces,
    placesScope, currentPlacesView, shareSearch, retainedViewSearch, unavailableSaved,
    applyPlacesView, selectedPlace, selectedCategory, selectedSource, mappedPlaces,
    selectPlace, discoverPlacesAlongTrip, updatePlaceBounds
  };
}

export type NearbyPlacesDiscovery = ReturnType<typeof useNearbyPlacesDiscovery>;
