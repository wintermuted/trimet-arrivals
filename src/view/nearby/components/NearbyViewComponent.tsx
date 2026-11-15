import { Button } from "@wintermuted/ui-theme/react";
import { Map } from "mapbox-gl";
import { Dictionary, map, set, size } from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { Outlet, useOutletContext } from "react-router";
import { useNavigate } from "react-router-dom";
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
  showDirectionsSelection
} from "../util/mapbox/directionsSelection";
import NearbyStops from "./NearbyStops";
import NearbyRoutes from "./NearbyRoutes";
import NearbyDirections from "./NearbyDirections";

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
  handleSimpleRoutesOpened: () => void;
}

export function NearbyStopDetailComponent() {
  const { currentLocation, handleStopOpened } = useOutletContext<
    NearbyViewComponentOutletContextProps
  >();
  return (
    <NearbyStopsDetail
      currentLocation={currentLocation}
      handleStopOpened={handleStopOpened}
    />
  );
}

export function NearbyStopsComponent() {
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
    <div>
      <br />
      <NearbyStops
        currentLocation={currentLocation}
        radiusSize={radiusSize}
        nearbyStops={nearbyStops}
        stopCount={stopCount}
        routeCount={routeCount}
        handleRadiusSelectionChange={handleRadiusSelectionChange}
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
    handleSimpleRoutesOpened
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
        routeCount={routeCount}
        stopCount={stopCount}
      />
    </div>
  );
}

export function NearbySimpleRouteArrivalsComp() {
  const { handleDirectionsSelection } = useOutletContext<
    NearbyViewComponentOutletContextProps
  >();

  return (
    <NearbySimpleRouteArrivals
      onSelectionChanged={handleDirectionsSelection}
    />
  );
}

export function NearbyDirectionsComp({ showTripTimes = false }: { showTripTimes?: boolean }) {
  const { handleDirectionsSelection } = useOutletContext<
    NearbyViewComponentOutletContextProps
  >();

  return (
    <NearbyDirections onSelectionChanged={handleDirectionsSelection} showTripTimes={showTripTimes} />
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
        const nearbyRouteIds = getNearbyRouteIds(routes);
        const stopLocations = getStopLocations(stopData);

        removeStopLocationLayers(mapRef.current);
        removeCurrentLocationMarkers(mapRef.current);
        removeRoutes(mapRef.current, Object.keys(nearbyRouteIds));

        setNearbyStopData(stopData);
        setNearbyRoutesData(routes);
        setNearbyDataError(false);
        setIsNearbyDataLoading(false);
        setNearbyStops(
          mapRef.current,
          stopLocations,
          Object.keys(nearbyRouteIds),
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
    mapRef.current = initializeCurrentLocationMarker(
      mapRef.current,
      lng,
      lat,
      radiusSize
    );

    mapRef.current.on("load", () => {
      console.info("effect: initialize map markers and routes");
      // mapRef.current = setNearbyStops(mapRef.current, stopLocations, Object.keys(nearbyRouteIds), handleStopMarkerClick);
      setIsMapLoaded(true);
    });
  }

  function handleRadiusSelectionChange(e) {
    console.log("handle radius selection change", e.target.value);
    setRadiusSize(e.target.value);
  }

  function handleStopMarkerClick(data: any) {
    console.log("handle stop marker click", data);
    navigate(`/nearby/stops/${data.properties.locid}`);
  }

  function flyToCenter(lng: number, lat: number) {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [lng, lat],
        essential: true // this animation is considered essential with respect to prefers-reduced-motion
      });
    }
  }

  function handleStopOpened(stopLocation: ArrivalLocation) {
    flyToCenter(stopLocation.lng, stopLocation.lat);
    updateStopMarkerColor(mapRef.current, `${stopLocation.id}`, "#ff0000");
  }

  const handleDirectionsSelection = useCallback((
    selection: DirectionsSelection,
    onError: () => void
  ) => showDirectionsSelection(mapRef.current, selection, onError), []);

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
    handleSimpleRoutesOpened
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
                onClick={() =>
                  userLocation && void fetchInitialData(userLocation)
                }
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
