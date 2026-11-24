import { Button } from "@wintermuted/ui-react";
import PlacesHelp from "./PlacesHelp";
import mapboxgl, { Map } from "mapbox-gl";
import { Feature, LineString } from "geojson";
import { clearWalkingCache, setWalkingAccessToken } from "../../../api/mapbox/walking";
import { showWalkingRoute } from "../util/mapbox/walkingRoute";
import { useFeatureFlags } from "../../../component/feature-flags/FeatureFlags";
import { Dictionary } from "lodash";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Outlet } from "react-router";
import { NearbyLauncher, NearbyViewComponentOutletContextProps } from "./NearbyOutletViews";
import { matchPath, useLocation, useMatch, useNavigate } from "react-router-dom";
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
} from "@overworld/trimet-client";
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
import { ArrivalLocation } from "../../../api/trimet/interfaces/arrivals";
import {
  DirectionsSelection,
  highlightDirectionsStop,
  showDirectionsSelection
} from "../util/mapbox/directionsSelection";
import { TrimetRoute as DetailedRoute } from "../../../api/trimet/interfaces/routes";
import { highlightRouteInfoStop, showRouteInfo } from "../util/mapbox/routeInfo";
import { stopDetailUrl } from "../util/stopNavigation";
import { TopNavBar } from "./common/TopNavBar";
import NearbyVehicles from "./NearbyVehicles";
import { useVehiclePositions } from "../util/useVehiclePositions";
import { VehiclePosition } from "../../../api/trimet/interfaces/vehicles";
import FollowedVehicleTrip from "./FollowedVehicleTrip";
import { VehicleFollowView } from "../util/mapbox/vehicleLayer";
import { placeCategoryForId, placeDetailLink } from "@overworld/places/catalog";
import { placesViewSearch, readPlacesView } from "@overworld/places/discovery";

import { DEFAULT_RADIUS, SERVICE_AREA_CENTER, SERVICE_AREA_ZOOM } from "./nearbyViewSettings";
import useNearbyPlacesDiscovery from "./useNearbyPlacesDiscovery";
import { NearbyPlacesLayers, NearbyPlacesSidebar } from "./NearbyPlacesDiscovery";

export {
  NearbyTripPlannerComponent, NearbyStopDetailComponent, NearbyStopsComponent,
  NearbySimpleRoutesComp, NearbySimpleRouteArrivalsComp, NearbyDirectionsComp,
  NearbyRoutesComponent
} from "./NearbyOutletViews";
export type { NearbyViewComponentOutletContextProps } from "./NearbyOutletViews";

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
  const canCenterOnDevice = !isLanding && !isPlanner && !isPlaces && !isStopDetail;
  const canCenterOnDeviceRef = useRef(canCenterOnDevice);
  canCenterOnDeviceRef.current = canCenterOnDevice;
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
  const initialLocationRequest = useRef<Promise<Location>>(undefined);
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
  const places = useNearbyPlacesDiscovery(mapRef, isMapLoaded, isPlaces, selectedPlaceId);
  const { sharedPlacesView, retainedViewSearch, placesScope, discoverPlacesAlongTrip } = places;

  useEffect(() => () => clearWalkingCache(), []);

  const currentLocation = [
    userLocation?.coords?.longitude,
    userLocation?.coords?.latitude
  ];

  const lng = currentLocation[0];
  const lat = currentLocation[1];

  const nearbyRouteIds = useMemo(() => nearbyRoutes && getNearbyRouteIds(nearbyRoutes), [nearbyRoutes]);
  const stopLocations = nearbyStops && getStopLocations(nearbyStops);
  const locate = useCallback(async (background = false) => {
    const request = ++locationRequestRef.current;
    setIsLocating(true);
    setLocationError(false);
    try {
      const position = await (background
        ? initialLocationRequest.current ?? (initialLocationRequest.current = getCurrentPosition())
        : getCurrentPosition());
      if (request !== locationRequestRef.current) return;
      setUserLocation(position);
      setSearchMode("device");
      if (!background && !canCenterOnDeviceRef.current) mapRef.current?.flyTo({
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
    void locate(true);
    return () => { locationRequestRef.current += 1; };
  }, [locate]);

  useEffect(() => {
    if (!canCenterOnDevice || !userLocation || searchMode !== "device") return;
    mapRef.current?.flyTo({
      center: [userLocation.coords.longitude, userLocation.coords.latitude],
      zoom: nearbyZoomRef.current,
      essential: true,
    });
  }, [canCenterOnDevice, userLocation, searchMode]);

  useEffect(() => {
    const returningToLanding = isLanding && !wasLanding.current;
    wasLanding.current = isLanding;
    if (!returningToLanding) return;

    setNearbyStopData(undefined);
    setNearbyRoutesData(undefined);
    setNearbyDataError(false);
    setIsNearbyDataLoading(false);
    mapRef.current?.flyTo({ center: SERVICE_AREA_CENTER, zoom: SERVICE_AREA_ZOOM, bearing: 0, pitch: 0 });
  }, [isLanding]);

  useEffect(() => {
    if (!userLocation || isLanding || isPlanner || isPlaces || fromHome) return;
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
  }, [userLocation, radiusSize, retryCount, isLanding, isPlanner, isPlaces, fromHome]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    removeStopLocationLayers(mapRef.current);
    if (!isLanding && !isPlanner && !isPlaces && !isChoosingDirectionStop && !hideNearbyStopsForFollow && stopLocations && nearbyRouteIds) {
      setNearbyStops(mapRef.current, stopLocations, Object.keys(nearbyRouteIds), handleStopMarkerClick);
    }
  }, [isMapLoaded, nearbyStops, nearbyRoutes, isLanding, isPlanner, isPlaces, isChoosingDirectionStop, hideNearbyStopsForFollow]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !nearbyRouteIds || isLanding || isPlanner || isPlaces || isDirections || isRouteInfo || following) return;
    return showNearbyRouteLines(mapRef.current, nearbyRouteIds);
  }, [isMapLoaded, nearbyRouteIds, isLanding, isPlanner, isPlaces, isDirections, isRouteInfo, following]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    removeCurrentLocationMarkers(mapRef.current);
    if (!isLanding && !isPlanner && !isPlaces && !following && userLocation) {
      setCurrentLocationMarker(mapRef.current, lng, lat, radiusSize);
    }
  }, [isMapLoaded, userLocation, radiusSize, isLanding, isPlanner, isPlaces, following]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || isLanding || isPlanner || isPlaces || following || !userLocation || searchMode !== "pin") return;
    const marker = new mapboxgl.Marker({ draggable: true })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);
    const onDragEnd = () => {
      const point = marker.getLngLat();
      setUserLocation({ coords: { longitude: point.lng, latitude: point.lat } });
    };
    marker.on("dragend", onDragEnd);
    return () => { marker.off("dragend", onDragEnd); marker.remove(); };
  }, [isMapLoaded, userLocation, searchMode, isLanding, isPlanner, isPlaces, following]);

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
    handleRouteInfoStopHighlighted,
    discoverPlacesAlongTrip
  };

  const waitingForLocation = !userLocation && isLocating;
  const sidebarLoadingMessage = waitingForLocation ? "Finding your location…" :
    isNearbyDataLoading || (userLocation && !nearbyStops && !nearbyDataError) ? "Loading nearby stops…" :
      nearbyStops && !isMapLoaded ? "Preparing nearby results…" : undefined;
  const canShowNearbyResults = !nearbyDataError && !sidebarLoadingMessage && isMapLoaded && Boolean(nearbyStops);
  const sectionTitle = isPlaces ? "Places" : isPlanner ? "Plan a trip" :
    isExplore && !(isRouteInfo && canShowNearbyResults) ? "Explore" : undefined;
  const plannerPlaceId = searchParams.get("toPlaceId");
  const plannerSharedView = readPlacesView(searchParams.get("placesView") || "");
  const plannerViewSearch = plannerSharedView.view ? placesViewSearch(plannerSharedView.view, plannerSharedView.viewport) : "";
  const sectionBackTo = selectedPlaceId ? `/nearby/places${retainedViewSearch}` :
    isPlanner && (searchParams.get("confirmPlace") === "1" || plannerSharedView.view) && placeCategoryForId(plannerPlaceId || "")
      ? placeDetailLink(plannerPlaceId, plannerViewSearch) : "/nearby";

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
            {sectionTitle && !following && <TopNavBar id={sectionTitle} backTo={sectionBackTo}
              action={isPlaces && <PlacesHelp label="Places"
                text="Explore Portland places and practical stops. Filter by category or move the map to explore another area." />} />}
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
              <NearbyLauncher />
            ) : isPlaces ? (
              <NearbyPlacesSidebar discovery={places} selectedPlaceId={selectedPlaceId}
                currentLocation={currentLocation} searchMode={searchMode} />
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
          {isPlaces && isMapLoaded && <NearbyPlacesLayers discovery={places} map={mapRef.current}
            selectedPlaceId={selectedPlaceId} />}
          {/* Keep the map owner last so overlay cleanups run before map.remove(). */}
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
            locationError={locationError}
            isMapLoading={!isMapLoaded}
            searchMode={searchMode}
            placesMode={isPlaces}
            placesScope={placesScope}
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
        </div>
      </div>
    </div>
  );
}
