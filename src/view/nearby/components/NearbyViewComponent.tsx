import { Button } from "@wintermuted/ui-theme/react";
import mapboxgl, { Map } from "mapbox-gl";
import { Feature, LineString } from "geojson";
import { clearWalkingCache, setWalkingAccessToken } from "../../../api/mapbox/walking";
import { showWalkingRoute } from "../util/mapbox/walkingRoute";
import { useFeatureFlags } from "../../../component/feature-flags/FeatureFlags";
import { Dictionary, map, set, size } from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { Outlet, useOutletContext } from "react-router";
import { Link, matchPath, NavLink, useLocation, useNavigate } from "react-router-dom";
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
import { setMapZoom } from "../util/mapbox/mapZoom";
import NearbyMapV2 from "./NearbyMapV2";
import "./NearbyViewComponent.scss";
import { setCurrentLocationMarker } from "../util/mapbox/currentLocation";
import { initializeMap } from "../util/mapbox/initializeMap";
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
import TripPlannerView from "../../tripPlanner/TripPlannerView";
import NearbyPlannerPaths from "./NearbyPlannerPaths";

const DEFAULT_RADIUS = 1000;
const SERVICE_AREA_CENTER: [number, number] = [-122.6784, 45.5152];

export interface NearbyViewComponentOutletContextProps {
  plannerMap?: Map;
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
  const { plannerMap, walkingEnabled } = useOutletContext<NearbyViewComponentOutletContextProps>();
  return (
    <TripPlannerView
      inSidebar
      renderMapStatus={(itineraries, selected) => (
        <NearbyPlannerPaths map={plannerMap} itineraries={itineraries} selected={selected} walkingEnabled={walkingEnabled} />
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
      <br />
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
  const isPlanner = Boolean(matchPath("/nearby/planner", location.pathname));
  const isStopDetail = Boolean(matchPath("/nearby/stops/:id", location.pathname));
  const fromHome = isStopDetail &&
    new URLSearchParams(location.search).getAll("referrer").length === 1 &&
    new URLSearchParams(location.search).get("referrer") === "/";
  const [zoom, setZoom] = useState(16);
  const [radiusSize, setRadiusSize] = useState<number>(DEFAULT_RADIUS);
  const [nearbyStops, setNearbyStopData] = useState<StopData>(undefined);
  const [nearbyRoutes, setNearbyRoutesData] = useState<
    Dictionary<TrimetRoute[]>
  >(undefined);
  const [userLocation, setUserLocation] = useState<Location>(undefined);
  const [mapCenter, setMapCenter] = useState<[number, number]>();
  const [searchMode, setSearchMode] = useState<"none" | "device" | "area" | "pin">("none");
  const [locationError, setLocationError] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const locationRequestRef = useRef(0);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [nearbyDataError, setNearbyDataError] = useState(false);
  const [isNearbyDataLoading, setIsNearbyDataLoading] = useState(false);
  const { walkingEnabled } = useFeatureFlags();

  useEffect(() => () => clearWalkingCache(), []);

  const currentLocation = [
    userLocation?.coords?.longitude,
    userLocation?.coords?.latitude
  ];

  const lng = currentLocation[0];
  const lat = currentLocation[1];

  const nearbyRouteIds = nearbyRoutes && getNearbyRouteIds(nearbyRoutes);
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
      setMapCenter(center => center ?? [position.coords.longitude, position.coords.latitude]);
      mapRef.current?.flyTo({ center: [position.coords.longitude, position.coords.latitude], essential: true });
    } catch {
      if (request !== locationRequestRef.current) return;
      setLocationError(true);
      setMapCenter(center => center ?? SERVICE_AREA_CENTER);
    } finally {
      if (request === locationRequestRef.current) setIsLocating(false);
    }
  }, []);

  useEffect(() => {
    if (fromHome) {
      setMapCenter(center => center ?? SERVICE_AREA_CENTER);
    } else {
      void locate();
    }
    return () => { locationRequestRef.current += 1; };
  }, [locate, fromHome]);

  useEffect(() => {
    if (!userLocation) return;
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
  }, [userLocation, radiusSize, retryCount]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    removeStopLocationLayers(mapRef.current);
    if (stopLocations && nearbyRouteIds) {
      setNearbyStops(mapRef.current, stopLocations, Object.keys(nearbyRouteIds), handleStopMarkerClick);
    }
  }, [isMapLoaded, nearbyStops, nearbyRoutes]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    removeCurrentLocationMarkers(mapRef.current);
    if (userLocation) {
      setCurrentLocationMarker(mapRef.current, lng, lat, radiusSize);
    }
  }, [isMapLoaded, userLocation, radiusSize]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !userLocation || searchMode !== "pin") return;
    const marker = new mapboxgl.Marker({ draggable: true })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);
    const onDragEnd = () => {
      const point = marker.getLngLat();
      setUserLocation({ coords: { longitude: point.lng, latitude: point.lat } });
    };
    marker.on("dragend", onDragEnd);
    return () => { marker.off("dragend", onDragEnd); marker.remove(); };
  }, [isMapLoaded, userLocation, searchMode]);

  function initializeMapboxMap() {
    mapRef.current = initializeMap(mapCenter[0], mapCenter[1], mapContainerRef, zoom);
    setWalkingAccessToken(mapboxgl.accessToken);
    mapRef.current.on("load", () => {
      setIsMapLoaded(true);
    });
  }

  function handleRadiusSelectionChange(e) {
    const radius = Number(e.target.value);
    setRadiusSize(radius);
    if (mapRef.current) setMapZoom(mapRef, radius, setZoom);
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
  const handleRouteInfoChanged = useCallback((route: DetailedRoute, onError: () => void) =>
    showRouteInfo(mapRef.current, route, onError, (stopId) =>
      navigate(stopDetailUrl(stopId, `${location.pathname}${location.search}${location.hash}`))),
    [navigate, location.pathname, location.search, location.hash]);
  const handleRouteInfoStopHighlighted = useCallback((stopId?: number) =>
    highlightRouteInfoStop(mapRef.current, stopId), []);

  function handleSimpleRoutesOpened() {
    console.info("simple routes opened");
    if (!mapRef.current || !stopLocations || !nearbyRouteIds) return;
    mapRef.current = removeStopLocationLayers(mapRef.current);
    mapRef.current = setNearbyStops(mapRef.current, stopLocations, Object.keys(nearbyRouteIds), handleStopMarkerClick);
    flyToCenter(lng, lat);
  }

  const context: NearbyViewComponentOutletContextProps = {
    plannerMap: isMapLoaded ? mapRef.current : undefined,
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

  return (
    <div className="transit-container transit-nearby-view">
      <div className="transit-columns transit-nearby-layout">
        <div className="transit-column transit-nearby-sidebar">
          <nav aria-label="Nearby sidebar" className="wm-tab-bar transit-nearby-sidebar-nav">
            <Link
              to="/nearby/simple-routes"
              className={`wm-tab-btn${isPlanner ? "" : " wm-tab-btn-active"}`}
              aria-current={isPlanner ? undefined : "location"}
            >
              Explore
            </Link>
            <NavLink
              to="/nearby/planner"
              className={({ isActive }) => `wm-tab-btn${isActive ? " wm-tab-btn-active" : ""}`}
            >
              Plan a trip
            </NavLink>
          </nav>
          <div
            key={isPlanner ? "planner" : "explore"}
            className="transit-nearby-results"
            role="region"
            aria-label="Nearby transit"
            tabIndex={0}
          >
            {locationError && !isPlanner && (
              <div role="alert" className="transit-route-list-message">
                <p>Location unavailable. Check your browser permissions and try again, or search the map.</p>
                <Button type="button" size="sm" onClick={() => void locate()}>Try my location again</Button>
              </div>
            )}
            {isPlanner || isStopDetail ? (
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
            ) : isLocating && !userLocation ? (
              <p role="status">Finding your location…</p>
            ) : isNearbyDataLoading ? (
              <p role="status">Loading nearby stops…</p>
            ) : isMapLoaded && nearbyStops ? (
              <Outlet context={context} />
            ) : null}
          </div>
        </div>
        <div className="transit-column transit-column-9 transit-nearby-map-panel">
          {mapCenter && (
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
              searchMode={searchMode}
            />
          )}
        </div>
      </div>
    </div>
  );
}
