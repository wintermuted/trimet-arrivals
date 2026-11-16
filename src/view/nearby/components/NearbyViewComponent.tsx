import { Button } from "@wintermuted/ui-theme/react";
import mapboxgl, { Map } from "mapbox-gl";
import { Feature, LineString } from "geojson";
import { clearWalkingCache, setWalkingAccessToken } from "../../../api/mapbox/walking";
import { showWalkingRoute } from "../util/mapbox/walkingRoute";
import { useFeatureFlags } from "../../../component/feature-flags/FeatureFlags";
import { Dictionary, map, set, size } from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { Outlet, useOutletContext } from "react-router";
import { useLocation, useNavigate } from "react-router-dom";
import geoLocateCurrentPosition from "../../../api/geolocation/geoLocateCurrentPosition";
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
import {
  initializeCurrentLocationMarker,
  setCurrentLocationMarker
} from "../util/mapbox/currentLocation";
import { initializeMap } from "../util/mapbox/initializeMap";
import { removeRoutes } from "../util/mapbox/routeLines";
import {
  highlightNearbyStop,
  removeCurrentLocationMarkers,
  removeStopLocationLayers,
  setNearbyStops,
  updateStopMarkerColor
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

const DEFAULT_RADIUS = 1000;

export interface NearbyViewComponentOutletContextProps {
  currentLocation: number[];
  nearbyRoutes: Dictionary<TrimetRoute[]>;
  nearbyStops: StopData;
  radiusSize: number;
  handleRadiusSelectionChange: (e: any) => void;
  initializeMap: () => void;
  handleStopOpened: (stopLocation: ArrivalLocation) => void;
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
    handleWalkingRouteChanged
  } = useOutletContext<
    NearbyViewComponentOutletContextProps
  >();

  return (
    <NearbySimpleRouteArrivals
      onSelectionChanged={handleDirectionsSelection}
      currentLocation={currentLocation}
      walkingEnabled={walkingEnabled}
      onWalkingRouteChanged={handleWalkingRouteChanged}
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
  const [zoom, setZoom] = useState(16);
  const [radiusSize, setRadiusSize] = useState<number>(DEFAULT_RADIUS);
  const [nearbyStops, setNearbyStopData] = useState<StopData>(undefined);
  const [nearbyRoutes, setNearbyRoutesData] = useState<
    Dictionary<TrimetRoute[]>
  >(undefined);
  const [userLocation, setUserLocation] = useState<Location>(undefined);
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
  const showMap = currentLocation && nearbyRouteIds && stopLocations;

  async function fetchInitialData(location) {
    setNearbyDataError(false);
    setIsNearbyDataLoading(true);
    try {
      const stopData: StopData = await getNearbyStops(location, radiusSize);
      const routes = processRoutes(stopData);
      setNearbyStopData(stopData);
      setNearbyRoutesData(routes);
    } catch {
      setNearbyDataError(true);
    } finally {
      setIsNearbyDataLoading(false);
    }
  }

  // Initial Load
  useEffect(() => {
    if (userLocation) {
      fetchInitialData(userLocation);
    } else {
      geoLocateCurrentPosition().then((location: Location) => {
        setUserLocation(location);
        fetchInitialData(location);
      });
    }
  }, []);

  // Radius Size Change
  useEffect(() => {
    if (!mapRef.current) {
      return;
    }
    console.log("radius size change", radiusSize);
    setMapZoom(mapRef, radiusSize, setZoom);
    setNearbyDataError(false);
    setIsNearbyDataLoading(true);

    let active = true;
    getNearbyStops(userLocation, radiusSize)
      .then((stopData: StopData) => {
        if (!active) {
          return;
        }
        const routes = processRoutes(stopData);
        const updatedRouteIds = getNearbyRouteIds(routes);
        const updatedStopLocations = getStopLocations(stopData);

        removeStopLocationLayers(mapRef.current);
        removeCurrentLocationMarkers(mapRef.current);
        removeRoutes(mapRef.current, Object.keys(updatedRouteIds));

        setNearbyStopData(stopData);
        setNearbyRoutesData(routes);
        setNearbyDataError(false);
        setIsNearbyDataLoading(false);
        setNearbyStops(
          mapRef.current,
          updatedStopLocations,
          Object.keys(updatedRouteIds),
          handleStopMarkerClick
        );
        setCurrentLocationMarker(mapRef.current, lng, lat, radiusSize);
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
  }, [radiusSize]);

  function initializeMapboxMap() {
    console.log("initialize map", lng, lat, zoom);
    mapRef.current = initializeMap(lng, lat, mapContainerRef, zoom);
    setWalkingAccessToken(mapboxgl.accessToken);
    mapRef.current = initializeCurrentLocationMarker(
      mapRef.current,
      lng,
      lat,
      radiusSize
    );

    mapRef.current.on("load", () => {
      console.info("effect: initialize map markers and routes");
      mapRef.current = setNearbyStops(
        mapRef.current,
        stopLocations,
        Object.keys(nearbyRouteIds),
        handleStopMarkerClick
      );
      setIsMapLoaded(true);
    });
  }

  function handleRadiusSelectionChange(e) {
    console.log("handle radius selection change", e.target.value);
    setRadiusSize(e.target.value);
  }

  function handleNearbyDataRetry() {
    if (userLocation) {
      void fetchInitialData(userLocation);
    }
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
    flyToCenter(stopLocation.lng, stopLocation.lat);
    updateStopMarkerColor(mapRef.current, `${stopLocation.id}`, "#ff0000");
  }, [flyToCenter]);

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
    mapRef.current = removeStopLocationLayers(mapRef.current);
    mapRef.current = setNearbyStops(
      mapRef.current,
      stopLocations,
      Object.keys(nearbyRouteIds),
      handleStopMarkerClick
    );
    flyToCenter(lng, lat);
  }

  const context: NearbyViewComponentOutletContextProps = {
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
        <div
          className="transit-column transit-column-3 transit-nearby-results"
          role="region"
          aria-label="Nearby transit"
          tabIndex={0}
        >
          {nearbyDataError ? (
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
          ) : isNearbyDataLoading && !nearbyStops ? (
            <p role="status">Loading nearby stops…</p>
          ) : isMapLoaded ? (
            <Outlet context={context} />
          ) : null}
        </div>
        <div className="transit-column transit-column-9 transit-nearby-map-panel">
          {showMap && (
            <NearbyMapV2
              initializeMap={initializeMapboxMap}
              zoom={zoom}
              mapRef={mapRef}
              mapContainerRef={mapContainerRef}
              currentLocation={currentLocation}
            />
          )}
        </div>
      </div>
    </div>
  );
}
