import { Button } from "@wintermuted/ui-theme/react";
import mapboxgl, { Map } from "mapbox-gl";
import { Feature, LineString } from "geojson";
import { clearWalkingCache, setWalkingAccessToken } from "../../../api/mapbox/walking";
import { showWalkingRoute } from "../util/mapbox/walkingRoute";
import { useFeatureFlags } from "../../../component/feature-flags/FeatureFlags";
import { Dictionary, map, set, size } from "lodash";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Outlet, useOutletContext } from "react-router";
import { Link, matchPath, useLocation, useMatch, useNavigate } from "react-router-dom";
import FontAwesome from "react-fontawesome";
import getCurrentPosition from "../../../api/geolocation/getCurrentPosition";
import {
  Location,
  StopData,
  TrimetRoute
} from "../../../api/trimet/interfaces/types";
import { getNearbyStops } from "../../../api/trimet/stops";
import {
  getNearbyRouteIds,
  getStopLocations,
  processRoutes
} from "../util/dataUtils";
import { getNearbyMapZoom } from "../util/mapbox/mapZoom";
import NearbyMapV2 from "./NearbyMapV2";
import "./NearbyViewComponent.scss";
import { setCurrentLocationMarker } from "../util/mapbox/currentLocation";
import { initializeMap } from "../util/mapbox/initializeMap";
import { showNearbyRouteLines } from "../util/mapbox/routeLines";
import {
  highlightNearbyStop,
  removeCurrentLocationMarkers,
  removeStopLocationLayers,
  setNearbyStops,
  showStopDetailMarker
} from "../util/mapbox/stopLocationMarker.util";
import NearbySimpleRoutes from "./NearbySimpleRoutes";
import NearbySimpleRouteArrivals from "./NearbySimpleRouteArrivals";
import { NearbyStopsDetail } from "./NearbyStopsDetail";
import { ArrivalLocation } from "../../../api/trimet/interfaces/arrivals";
import {
  DirectionsSelection,
  highlightDirectionsStop,
  showDirectionsSelection
} from "../util/mapbox/directionsSelection";
import NearbyStops from "./NearbyStops";
import NearbyRoutes from "./NearbyRoutes";
import NearbyDirections from "./NearbyDirections";
import { TrimetRoute as DetailedRoute } from "../../../api/trimet/interfaces/routes";
import { highlightRouteInfoStop, showRouteInfo } from "../util/mapbox/routeInfo";
import { stopDetailUrl } from "../util/stopNavigation";
import { ConnectedTripPlannerView } from "../../tripPlanner/TripPlannerView";
import NearbyPlannerPaths from "./NearbyPlannerPaths";
import { TopNavBar } from "./common/TopNavBar";
import NearbyVehicles from "./NearbyVehicles";
import { useVehiclePositions } from "../util/useVehiclePositions";
import { VehiclePosition } from "../../../api/trimet/interfaces/vehicles";
import FollowedVehicleTrip from "./FollowedVehicleTrip";
import { VehicleFollowView } from "../util/mapbox/vehicleLayer";
import NearbyPlaces from "./NearbyPlaces";
import NearbyPlacesMap from "./NearbyPlacesMap";
import NearbyNeighborhoodsMap from "./NearbyNeighborhoodsMap";
import NearbyPlaceDestination from "./NearbyPlaceDestination";
import { DEFAULT_PLACE_FILTERS, filterPlaces, placeCategoryForId, placeDetailLink, placeInBounds, PlaceFilters, usePlaceCatalog } from "../../../api/places/places";
import { useNeighborhoods } from "../../../api/places/neighborhoods";
import { DEFAULT_LINE_OVERLAYS, LINE_OVERLAY_CATEGORIES, LineOverlayCategory, useLineOverlay } from "../../../api/places/lineOverlays";
import NearbyLineOverlayMap from "./NearbyLineOverlayMap";
import { CONTEXT_CATEGORIES, ContextCategory, DEFAULT_CONTEXT_OVERLAYS, useContextOverlay } from "../../../api/places/contextOverlays";
import NearbyContextMap from "./NearbyContextMap";

const DEFAULT_RADIUS = 1000;
const SERVICE_AREA_CENTER: [number, number] = [-122.6784, 45.5152];
const SERVICE_AREA_ZOOM = 10;

export interface NearbyViewComponentOutletContextProps {
  plannerMap?: Map;
  plannerMapSuspended?: boolean;
  plannerFooter?: HTMLDivElement;
  currentLocation: number[];
  nearbyRoutes: Dictionary<TrimetRoute[]>;
  nearbyStops: StopData;
  radiusSize: number;
  handleRadiusSelectionChange: (e: any) => void;
  initializeMap: () => void;
  handleStopOpened: (stopLocation: ArrivalLocation) => void | (() => void);
  handleDirectionsSelection: (
    selection: DirectionsSelection,
    onError: () => void
  ) => () => void;
  handleDirectionsStopHighlighted: (stopId?: number) => void;
  handleNearbyStopHighlighted: (stopId?: number) => void;
  handleSimpleRoutesOpened: () => void;
  walkingEnabled: boolean;
  handleWalkingRouteChanged: (feature: Feature<LineString>) => () => void;
  handleRouteInfoChanged: (route: DetailedRoute, onError: () => void) => () => void;
  handleRouteInfoStopHighlighted: (stopId?: number) => void;
}

export function NearbyTripPlannerComponent() {
  const { plannerMap, plannerMapSuspended, plannerFooter, walkingEnabled } = useOutletContext<NearbyViewComponentOutletContextProps>();
  return (
    <ConnectedTripPlannerView
      inSidebar
      directionsFooter={plannerFooter}
      renderPlaceDestination={place => <NearbyPlaceDestination map={plannerMap} place={place} />}
      renderMapStatus={(itineraries, selected, highlightedLeg, onMapLeg, routeColors, previewTrip) => (
        <NearbyPlannerPaths
          map={plannerMap}
          suspended={plannerMapSuspended}
          itineraries={itineraries}
          selected={selected}
          previewTrip={previewTrip}
          walkingEnabled={walkingEnabled}
          highlightedLeg={highlightedLeg}
          onMapLeg={onMapLeg}
          routeColors={routeColors}
        />
      )}
    />
  );
}

export function NearbyStopDetailComponent() {
  const {
    currentLocation,
    handleStopOpened,
    walkingEnabled,
    handleWalkingRouteChanged
  } = useOutletContext<
    NearbyViewComponentOutletContextProps
  >();
  return (
    <NearbyStopsDetail
      currentLocation={currentLocation}
      handleStopOpened={handleStopOpened}
      walkingEnabled={walkingEnabled}
      onWalkingRouteChanged={handleWalkingRouteChanged}
    />
  );
}

export function NearbyStopsComponent() {
  const {
    currentLocation,
    nearbyRoutes,
    nearbyStops,
    radiusSize,
    handleRadiusSelectionChange,
    handleNearbyStopHighlighted,
    walkingEnabled
  } = useOutletContext<NearbyViewComponentOutletContextProps>();

  const stopCount = nearbyStops?.location?.length;
  const routeCount = size(nearbyRoutes);

  return (
    <div>
      <br />
      <NearbyStops
        currentLocation={currentLocation}
        radiusSize={radiusSize}
        nearbyStops={nearbyStops}
        stopCount={stopCount}
        routeCount={routeCount}
        handleRadiusSelectionChange={handleRadiusSelectionChange}
        onStopHighlightChanged={handleNearbyStopHighlighted}
        walkingEnabled={walkingEnabled}
      />
    </div>
  );
}

export function NearbySimpleRoutesComp() {
  const {
    nearbyRoutes,
    nearbyStops,
    currentLocation,
    radiusSize,
    handleRadiusSelectionChange,
    handleSimpleRoutesOpened,
    handleNearbyStopHighlighted,
    handleRouteInfoChanged,
    handleRouteInfoStopHighlighted,
    walkingEnabled
  } = useOutletContext<NearbyViewComponentOutletContextProps>();

  const stopCount = nearbyStops?.location?.length;
  const routeCount = size(nearbyRoutes);

  return (
    <div>
      <NearbySimpleRoutes
        nearbyStops={nearbyStops}
        currentLocation={currentLocation}
        radiusSize={radiusSize}
        handleRadiusSelectionChange={handleRadiusSelectionChange}
        handleSimpleRoutesOpened={handleSimpleRoutesOpened}
        onStopHighlightChanged={handleNearbyStopHighlighted}
        onRouteInfoChanged={handleRouteInfoChanged}
        onRouteInfoStopHighlighted={handleRouteInfoStopHighlighted}
        walkingEnabled={walkingEnabled}
        routeCount={routeCount}
        stopCount={stopCount}
      />
    </div>
  );
}

export function NearbySimpleRouteArrivalsComp() {
  const {
    handleDirectionsSelection, currentLocation, walkingEnabled,
    handleWalkingRouteChanged, handleRouteInfoChanged, handleRouteInfoStopHighlighted
  } = useOutletContext<
    NearbyViewComponentOutletContextProps
  >();

  return (
    <NearbySimpleRouteArrivals
      onSelectionChanged={handleDirectionsSelection}
      currentLocation={currentLocation}
      walkingEnabled={walkingEnabled}
      onWalkingRouteChanged={handleWalkingRouteChanged}
      onRouteInfoChanged={handleRouteInfoChanged}
      onRouteInfoStopHighlighted={handleRouteInfoStopHighlighted}
    />
  );
}

export function NearbyDirectionsComp({
  showTripTimes = false, showTrip = false
}: { showTripTimes?: boolean; showTrip?: boolean }) {
  const { handleDirectionsSelection, handleDirectionsStopHighlighted } = useOutletContext<
    NearbyViewComponentOutletContextProps
  >();

  return (
    <NearbyDirections
      onSelectionChanged={handleDirectionsSelection}
      onStopHighlightChanged={handleDirectionsStopHighlighted}
      showTripTimes={showTripTimes}
      showTrip={showTrip}
    />
  );
}

export function NearbyRoutesComponent() {
  const {
    currentLocation,
    nearbyRoutes,
    nearbyStops,
    radiusSize,
    handleRadiusSelectionChange
  } = useOutletContext<NearbyViewComponentOutletContextProps>();

  const stopCount = nearbyStops?.location?.length;
  const routeCount = size(nearbyRoutes);

  return (
    <NearbyRoutes
      radiusSize={radiusSize}
      nearbyRoutes={nearbyRoutes}
      stopCount={stopCount}
      routeCount={routeCount}
      handleRadiusSelectionChange={handleRadiusSelectionChange}
    />
  );
}

export default function NearbyViewComponent() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef<Map>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = Boolean(matchPath("/nearby", location.pathname));
  const wasLanding = useRef(isLanding);
  const isExplore = Boolean(matchPath("/nearby/simple-routes", location.pathname));
  const isPlanner = Boolean(matchPath("/nearby/planner", location.pathname));
  const placeDetail = useMatch("/nearby/places/:placeId");
  const selectedPlaceId = placeDetail?.params.placeId;
  const isPlaces = Boolean(placeDetail || matchPath("/nearby/places", location.pathname));
  const isChoosingDirectionStop = Boolean(matchPath("/nearby/directions", location.pathname));
  const isDirections = Boolean(matchPath("/nearby/directions/*", location.pathname));
  const searchParams = new URLSearchParams(location.search);
  const routeInfoValues = searchParams.getAll("route");
  const routeInfoId = routeInfoValues[0];
  const routeDetail = matchPath("/nearby/simple-routes/:id", location.pathname);
  const isRouteInfo = routeInfoValues.length === 1 && /^\d+$/.test(routeInfoId) &&
    Number.isSafeInteger(Number(routeInfoId)) && Number(routeInfoId) > 0 &&
    (isExplore ||
      (routeDetail?.params.id === routeInfoId && /^[01]$/.test(searchParams.get("direction") ?? "")));
  const isStopDetail = Boolean(matchPath("/nearby/stops/:id", location.pathname));
  const fromHome = isStopDetail &&
    searchParams.getAll("referrer").length === 1 && searchParams.get("referrer") === "/";
  const shouldAutoLocate = !isLanding && !isPlanner && !isPlaces && !fromHome;
  const nearbyZoomRef = useRef(getNearbyMapZoom(DEFAULT_RADIUS));
  const [radiusSize, setRadiusSize] = useState<number>(DEFAULT_RADIUS);
  const [nearbyStops, setNearbyStopData] = useState<StopData>(undefined);
  const [nearbyRoutes, setNearbyRoutesData] = useState<
    Dictionary<TrimetRoute[]>
  >(undefined);
  const [userLocation, setUserLocation] = useState<Location>(undefined);
  const [searchMode, setSearchMode] = useState<"none" | "device" | "area" | "pin">("none");
  const [locationError, setLocationError] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const locationRequestRef = useRef(0);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [vehiclesEnabled, setVehiclesEnabled] = useState(true);
  const [vehicleMapError, setVehicleMapError] = useState(false);
  const [vehicleLayerAttempt, setVehicleLayerAttempt] = useState(0);
  const [following, setFollowing] = useState<VehiclePosition & { referrer: string }>();
  const followCameraEpoch = useRef(0);
  const followActive = useRef(false);
  const [followView, setFollowView] = useState<VehicleFollowView>("north-up");
  const vehicleMap = isMapLoaded ? mapRef.current : undefined;
  const vehicleFeed = useVehiclePositions(vehicleMap, vehiclesEnabled, following?.id);
  const handleVehicleFollow = useCallback((vehicle: VehiclePosition) => {
    followCameraEpoch.current += 1;
    followActive.current = true;
    setFollowing({ ...vehicle, referrer: `${location.pathname}${location.search}${location.hash}` });
    setVehiclesEnabled(true);
  }, [location.pathname, location.search, location.hash]);
  function stopFollowing() {
    followActive.current = false;
    setFollowing(undefined);
  }
  const [nearbyDataError, setNearbyDataError] = useState(false);
  const [isNearbyDataLoading, setIsNearbyDataLoading] = useState(false);
  const { walkingEnabled } = useFeatureFlags();
  const placeCatalog = usePlaceCatalog(isPlaces);
  const [placeFilters, setPlaceFilters] = useState<PlaceFilters>(DEFAULT_PLACE_FILTERS);
  const [placeBounds, setPlaceBounds] = useState<[number, number, number, number]>();
  const [placeZoom, setPlaceZoom] = useState(0);
  const [placeMapError, setPlaceMapError] = useState(false);
  const [neighborhoodsShown, setNeighborhoodsShown] = useState(false);
  const [neighborhoodPolygonsShown, setNeighborhoodPolygonsShown] = useState(false);
  const neighborhoods = useNeighborhoods(isPlaces && neighborhoodsShown);
  const [neighborhoodMapError, setNeighborhoodMapError] = useState(false);
  const [neighborhoodLayerRevision, setNeighborhoodLayerRevision] = useState(0);
  const [lineOverlaysShown, setLineOverlaysShown] = useState(DEFAULT_LINE_OVERLAYS);
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
  const [contextShown, setContextShown] = useState(DEFAULT_CONTEXT_OVERLAYS);
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
  const placeViewport = useRef<{ center: [number, number]; zoom: number }>();
  const filteredPlaces = useMemo(() => filterPlaces(placeCatalog.places, placeFilters),
    [placeCatalog.sources, placeFilters]);
  const visiblePlaces = useMemo(() => placeBounds
    ? filteredPlaces.filter(place => placeInBounds(place, placeBounds)) : [], [filteredPlaces, placeBounds]);
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
    navigate(id ? placeDetailLink(id) : "/nearby/places");
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
      else if (!selectedPlaceId) mapRef.current?.jumpTo(placeViewport.current ?? { center: SERVICE_AREA_CENTER, zoom: 12 });
    }
  }, [isPlaces, isMapLoaded, selectedPlaceId, selectedPlace]);

  useEffect(() => () => clearWalkingCache(), []);

  const currentLocation = [
    userLocation?.coords?.longitude,
    userLocation?.coords?.latitude
  ];

  const lng = currentLocation[0];
  const lat = currentLocation[1];

  const nearbyRouteIds = useMemo(() => nearbyRoutes && getNearbyRouteIds(nearbyRoutes), [nearbyRoutes]);
  const stopLocations = nearbyStops && getStopLocations(nearbyStops);
  const locate = useCallback(async () => {
    const request = ++locationRequestRef.current;
    setIsLocating(true);
    setLocationError(false);
    try {
      const position = await getCurrentPosition();
      if (request !== locationRequestRef.current) return;
      setUserLocation(position);
      setSearchMode("device");
      mapRef.current?.flyTo({
        center: [position.coords.longitude, position.coords.latitude],
        zoom: nearbyZoomRef.current,
        essential: true,
      });
    } catch {
      if (request !== locationRequestRef.current) return;
      setLocationError(true);
    } finally {
      if (request === locationRequestRef.current) setIsLocating(false);
    }
  }, []);

  const hideNearbyStopsForFollow = Boolean(following) && !isRouteInfo;
  useEffect(() => {
    if (shouldAutoLocate) void locate();
    else setIsLocating(false);
    return () => { locationRequestRef.current += 1; };
  }, [locate, shouldAutoLocate]);

  useEffect(() => {
    const returningToLanding = isLanding && !wasLanding.current;
    wasLanding.current = isLanding;
    if (!returningToLanding) return;

    locationRequestRef.current += 1;
    setIsLocating(false);
    setLocationError(false);
    setUserLocation(undefined);
    setSearchMode("none");
    setNearbyStopData(undefined);
    setNearbyRoutesData(undefined);
    setNearbyDataError(false);
    setIsNearbyDataLoading(false);
    mapRef.current?.flyTo({ center: SERVICE_AREA_CENTER, zoom: SERVICE_AREA_ZOOM, bearing: 0, pitch: 0 });
  }, [isLanding]);

  useEffect(() => {
    if (!userLocation || isPlaces) return;
    setNearbyDataError(false);
    setIsNearbyDataLoading(true);
    setNearbyStopData(undefined);
    setNearbyRoutesData(undefined);
    let active = true;
    getNearbyStops(userLocation, radiusSize)
      .then((stopData: StopData) => {
        if (!active) return;
        if (!stopData || "error" in stopData) throw new Error("Nearby stop lookup failed.");
        const normalized = { ...stopData, location: stopData.location ?? [] };
        setNearbyStopData(normalized);
        setNearbyRoutesData(processRoutes(normalized));
        setIsNearbyDataLoading(false);
      })
      .catch(() => {
        if (active) {
          setNearbyDataError(true);
          setIsNearbyDataLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [userLocation, radiusSize, retryCount, isPlaces]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    removeStopLocationLayers(mapRef.current);
    if (!isPlanner && !isPlaces && !isChoosingDirectionStop && !hideNearbyStopsForFollow && stopLocations && nearbyRouteIds) {
      setNearbyStops(mapRef.current, stopLocations, Object.keys(nearbyRouteIds), handleStopMarkerClick);
    }
  }, [isMapLoaded, nearbyStops, nearbyRoutes, isPlanner, isPlaces, isChoosingDirectionStop, hideNearbyStopsForFollow]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !nearbyRouteIds || isPlanner || isPlaces || isDirections || isRouteInfo || following) return;
    return showNearbyRouteLines(mapRef.current, nearbyRouteIds);
  }, [isMapLoaded, nearbyRouteIds, isPlanner, isPlaces, isDirections, isRouteInfo, following]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    removeCurrentLocationMarkers(mapRef.current);
    if (!isPlanner && !isPlaces && !following && userLocation) {
      setCurrentLocationMarker(mapRef.current, lng, lat, radiusSize);
    }
  }, [isMapLoaded, userLocation, radiusSize, isPlanner, isPlaces, following]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || isPlanner || isPlaces || following || !userLocation || searchMode !== "pin") return;
    const marker = new mapboxgl.Marker({ draggable: true })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);
    const onDragEnd = () => {
      const point = marker.getLngLat();
      setUserLocation({ coords: { longitude: point.lng, latitude: point.lat } });
    };
    marker.on("dragend", onDragEnd);
    return () => { marker.off("dragend", onDragEnd); marker.remove(); };
  }, [isMapLoaded, userLocation, searchMode, isPlanner, isPlaces, following]);

  function initializeMapboxMap() {
    mapRef.current = initializeMap(
      SERVICE_AREA_CENTER[0], SERVICE_AREA_CENTER[1], mapContainerRef,
      isPlaces ? 12 : isStopDetail ? nearbyZoomRef.current : SERVICE_AREA_ZOOM
    );
    setWalkingAccessToken(mapboxgl.accessToken);
    mapRef.current.on("load", () => {
      setIsMapLoaded(true);
    });
  }

  function handleRadiusSelectionChange(e) {
    const radius = Number(e.target.value);
    setRadiusSize(radius);
    nearbyZoomRef.current = getNearbyMapZoom(radius);
    mapRef.current?.setZoom(nearbyZoomRef.current);
  }

  function handleNearbyDataRetry() {
    setRetryCount(value => value + 1);
  }

  function searchMapCenter(mode: "area" | "pin") {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    locationRequestRef.current += 1;
    setIsLocating(false);
    setLocationError(false);
    setSearchMode(mode);
    setUserLocation({ coords: { longitude: center.lng, latitude: center.lat } });
  }

  function handleStopMarkerClick(data: any) {
    console.log("handle stop marker click", data);
    navigate(`/nearby/stops/${data.properties.locid}`);
  }

  const flyToCenter = useCallback((lng: number, lat: number) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [lng, lat],
        essential: true // this animation is considered essential with respect to prefers-reduced-motion
      });
    }
  }, []);

  const handleStopOpened = useCallback((stopLocation: ArrivalLocation) => {
    if (!isMapLoaded || !mapRef.current) return;
    const cleanup = showStopDetailMarker(mapRef.current, stopLocation);
    flyToCenter(stopLocation.lng, stopLocation.lat);
    return cleanup;
  }, [flyToCenter, isMapLoaded]);

  const handleDirectionsSelection = useCallback((
    selection: DirectionsSelection,
    onError: () => void
  ) => showDirectionsSelection(mapRef.current, selection, onError), []);
  const handleDirectionsStopHighlighted = useCallback((stopId?: number) =>
    highlightDirectionsStop(mapRef.current, stopId), []);
  const handleNearbyStopHighlighted = useCallback((stopId?: number) =>
    highlightNearbyStop(mapRef.current, stopId), []);
  const handleWalkingRouteChanged = useCallback((feature: Feature<LineString>) =>
    showWalkingRoute(mapRef.current, feature), []);
  const handleRouteInfoChanged = useCallback((route: DetailedRoute, onError: () => void) => {
    const epoch = followCameraEpoch.current;
    const isActive = () => !followActive.current;
    return showRouteInfo(mapRef.current, route, onError, (stopId) =>
      navigate(stopDetailUrl(stopId, `${location.pathname}${location.search}${location.hash}`)),
      () => isActive() && epoch === followCameraEpoch.current, isActive);
  }, [navigate, location.pathname, location.search, location.hash]);
  const handleRouteInfoStopHighlighted = useCallback((stopId?: number) =>
    highlightRouteInfoStop(mapRef.current, stopId), []);

  function handleSimpleRoutesOpened() {
    console.info("simple routes opened");
    if (!mapRef.current || !stopLocations || !nearbyRouteIds) return;
    mapRef.current = removeStopLocationLayers(mapRef.current);
    mapRef.current = setNearbyStops(mapRef.current, stopLocations, Object.keys(nearbyRouteIds), handleStopMarkerClick);
  }

  const [plannerFooter, setPlannerFooter] = useState<HTMLDivElement>();
  const bindPlannerFooter = useCallback((element: HTMLDivElement | null) => {
    setPlannerFooter(element ?? undefined);
  }, []);

  const context: NearbyViewComponentOutletContextProps = {
    plannerMap: isMapLoaded ? mapRef.current : undefined,
    plannerMapSuspended: Boolean(following),
    plannerFooter,
    currentLocation,
    nearbyRoutes,
    nearbyStops,
    radiusSize,
    handleRadiusSelectionChange,
    initializeMap: initializeMapboxMap,
    handleStopOpened,
    handleDirectionsSelection,
    handleDirectionsStopHighlighted,
    handleNearbyStopHighlighted,
    handleSimpleRoutesOpened,
    walkingEnabled,
    handleWalkingRouteChanged,
    handleRouteInfoChanged,
    handleRouteInfoStopHighlighted
  };

  const waitingForLocation = !userLocation && isLocating;
  const sidebarLoadingMessage = waitingForLocation ? "Finding your location…" :
    isNearbyDataLoading || (userLocation && !nearbyStops && !nearbyDataError) ? "Loading nearby stops…" :
      nearbyStops && !isMapLoaded ? "Preparing nearby results…" : undefined;
  const canShowNearbyResults = !nearbyDataError && !sidebarLoadingMessage && isMapLoaded && Boolean(nearbyStops);
  const sectionTitle = isPlaces ? "Places" : isPlanner ? "Plan a trip" :
    isExplore && !(isRouteInfo && canShowNearbyResults) ? "Explore" : undefined;
  const plannerPlaceId = searchParams.get("toPlaceId");
  const sectionBackTo = selectedPlaceId ? "/nearby/places" :
    isPlanner && searchParams.get("confirmPlace") === "1" && placeCategoryForId(plannerPlaceId || "")
      ? placeDetailLink(plannerPlaceId) : "/nearby";

  return (
    <div className="transit-container transit-nearby-view">
      <div className="transit-columns transit-nearby-layout">
        <div className="transit-column transit-nearby-sidebar">
          <div
            key={isLanding ? "landing" : isPlanner ? "planner" : isPlaces ? "places" : "explore"}
            className="transit-nearby-results"
            role="region"
            aria-label={isPlaces ? "Nearby places" : "Nearby transit"}
            tabIndex={0}
          >
            {sectionTitle && !following && <TopNavBar id={sectionTitle} backTo={sectionBackTo} />}
            {locationError && !isLanding && !isPlanner && !isPlaces && !following && (
              <div role="alert" className="transit-route-list-message">
                <p>Location unavailable. Check your browser permissions and try again, or search the map.</p>
                <Button type="button" size="sm" onClick={() => void locate()}>Try my location again</Button>
              </div>
            )}
            {isPlanner && <div hidden={Boolean(following)}><Outlet context={context} /></div>}
            {following && <FollowedVehicleTrip selection={following} feed={vehicleFeed}
              view={followView} onViewChange={setFollowView} backTo={following.referrer}
              onBack={stopFollowing} />}
            {!isPlanner && (!following || isRouteInfo) && <div hidden={Boolean(following)}>
            {isLanding ? (
              <nav aria-label="Nearby options" className="transit-nearby-launcher">
                <h2>Nearby</h2>
                <Link to="/nearby/simple-routes" className="transit-nearby-tile">
                  <FontAwesome name="compass" aria-hidden="true" />
                  <span><strong>Explore</strong><small>Find nearby stops and departures</small></span>
                  <FontAwesome name="chevron-right" aria-hidden="true" />
                </Link>
                <Link to="/nearby/planner" className="transit-nearby-tile">
                  <FontAwesome name="exchange" aria-hidden="true" />
                  <span><strong>Plan a trip</strong><small>Get directions between two places</small></span>
                  <FontAwesome name="chevron-right" aria-hidden="true" />
                </Link>
                <Link to="/nearby/places" className="transit-nearby-tile">
                  <FontAwesome name="map-marker" aria-hidden="true" />
                  <span><strong>Places</strong><small>Explore parks, food carts, gardens, markets, and more</small></span>
                  <FontAwesome name="chevron-right" aria-hidden="true" />
                </Link>
              </nav>
            ) : isPlaces ? (
              <>
                {coincidentIds.length > 1 && <section aria-label="Locations at this point">
                  <h3>Locations at this point</h3>
                  {mappedPlaces.filter(place => coincidentIds.includes(place.id)).map(place =>
                    <Link key={place.id} className="wm-btn wm-btn-secondary" to={placeDetailLink(place.id)}>{place.name}</Link>)}
                  <Button variant="ghost" onClick={() => setCoincidentIds([])}>Dismiss locations</Button>
                </section>}
                {selectedPlaceId && !selectedPlace ? <section className="transit-places" aria-label="Place details">
                  {selectedSource && !selectedSource.snapshot && !selectedSource.error ? (
                    <p role="status">Loading place details...</p>
                  ) : selectedSource?.error && selectedCategory ? (
                    <div role="alert">
                      <p>This place could not be loaded. Other places remain available.</p>
                      <Button variant="secondary" onClick={() => placeCatalog.retry(selectedCategory)}>Retry place</Button>
                    </div>
                  ) : <p role="alert">Place not found. This location may no longer be in the current catalog.</p>}
                </section> : <NearbyPlaces sources={placeCatalog.sources} filters={placeFilters} onFilters={setPlaceFilters}
                  visiblePlaces={visiblePlaces} selected={selectedPlace} onSelect={selectPlace}
                  contextOverlays={{ shown: contextShown, sources: contextSources, mapErrors: contextErrors,
                    onShown: (category, shown) => setContextShown(previous => ({ ...previous, [category]: shown })),
                    onRetry: category => {
                      contextSources[category].retry();
                      setContextRevisions(previous => ({ ...previous, [category]: previous[category] + 1 }));
                    } }}
                  lineOverlays={{ shown: lineOverlaysShown, sources: lineOverlaySources, mapErrors: lineOverlayErrors,
                    onShown: (category, shown) => setLineOverlaysShown(previous => ({ ...previous, [category]: shown })),
                    onRetry: category => {
                      lineOverlaySources[category].retry();
                      setLineOverlayRevisions(previous => ({ ...previous, [category]: previous[category] + 1 }));
                    } }}
                  neighborhoods={{ ...neighborhoods, shown: neighborhoodsShown, onShown: setNeighborhoodsShown,
                    polygonsShown: neighborhoodPolygonsShown, onPolygonsShown: setNeighborhoodPolygonsShown,
                    mapError: neighborhoodMapError, onRetry: () => {
                      neighborhoods.retry();
                      setNeighborhoodLayerRevision(value => value + 1);
                    } }}
                  origin={currentLocation} originMode={searchMode} onRetry={placeCatalog.retry} mapError={placeMapError} mapReady={Boolean(placeBounds)} />}
              </>
            ) : isStopDetail ? (
              <Outlet context={context} />
            ) : nearbyDataError ? (
              <div role="alert" className="transit-route-list-message">
                <p>Nearby stops could not be loaded.</p>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNearbyDataRetry}
                >
                  Retry
                </Button>
              </div>
            ) : sidebarLoadingMessage ? (
              <div className="transit-nearby-results-skeleton" role="status">
                <p>{sidebarLoadingMessage}</p>
                <div className="transit-nearby-skeleton-rows" aria-hidden="true">
                  {[0, 1, 2, 3].map(row => (
                    <div className="transit-nearby-skeleton-row" key={row}>
                      <span />
                      <span />
                      <span />
                    </div>
                  ))}
                </div>
              </div>
            ) : canShowNearbyResults ? (
              <Outlet context={context} />
            ) : null}
            </div>}
          </div>
          {isPlanner && <div hidden={Boolean(following)} className="transit-nearby-planner-footer" ref={bindPlannerFooter} />}
        </div>
        <div className="transit-column transit-column-9 transit-nearby-map-panel">
          <NearbyMapV2
            initializeMap={initializeMapboxMap}
            mapRef={mapRef}
            mapContainerRef={mapContainerRef}
            onSearchArea={() => searchMapCenter("area")}
            onDropPin={() => searchMapCenter("pin")}
            onFindMe={() => void locate()}
            radiusSize={radiusSize}
            onRadiusChange={handleRadiusSelectionChange}
            isLocating={isLocating}
            isMapLoading={!isMapLoaded}
            searchMode={searchMode}
            placesMode={isPlaces}
            vehiclesEnabled={vehiclesEnabled}
            onVehiclesToggle={() => {
              if (vehiclesEnabled) stopFollowing();
              setVehiclesEnabled(value => !value);
              setVehicleMapError(false);
            }}
            vehicleFeed={vehicleFeed}
            vehicleMapError={vehicleMapError}
            onVehiclesRetry={() => {
              setVehicleLayerAttempt(value => value + 1);
              vehicleFeed.retry();
            }}
          >
          {vehicleMap && vehiclesEnabled && (
            <NearbyVehicles
              key={vehicleLayerAttempt}
              map={vehicleMap}
              vehicles={vehicleFeed.vehicles}
              onError={setVehicleMapError}
              onFollow={handleVehicleFollow}
              following={following}
              followView={followView}
            />
          )}
          </NearbyMapV2>
          {isPlaces && isMapLoaded && neighborhoodsShown && neighborhoods.snapshot &&
            <NearbyNeighborhoodsMap key={neighborhoodLayerRevision} map={mapRef.current}
              snapshot={neighborhoods.snapshot} polygonsShown={neighborhoodPolygonsShown} onError={setNeighborhoodMapError} />}
          {isPlaces && isMapLoaded && LINE_OVERLAY_CATEGORIES.map(category =>
            lineOverlaysShown[category] && lineOverlaySources[category].snapshot &&
            <NearbyLineOverlayMap key={`${category}-${lineOverlayRevisions[category]}`} map={mapRef.current}
              snapshot={lineOverlaySources[category].snapshot} onError={handleLineOverlayError} />)}
          {isPlaces && isMapLoaded && CONTEXT_CATEGORIES.map(category =>
            contextShown[category] && contextSources[category].snapshot &&
            <NearbyContextMap key={`${category}-${contextRevisions[category]}`} map={mapRef.current}
              snapshot={contextSources[category].snapshot} onError={handleContextError} />)}
          {isPlaces && isMapLoaded && <NearbyPlacesMap map={mapRef.current} places={mappedPlaces}
            selectedId={selectedPlaceId} onSelect={selectPlace} onCoincident={setCoincidentIds}
            onBounds={updatePlaceBounds} onError={setPlaceMapError} />}
        </div>
      </div>
    </div>
  );
}
