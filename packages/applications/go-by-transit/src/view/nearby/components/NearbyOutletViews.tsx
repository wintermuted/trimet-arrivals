import React from "react";
import { Dictionary, size } from "lodash";
import { Map } from "mapbox-gl";
import { Feature, LineString } from "geojson";
import { useOutletContext } from "react-router";
import { Link, useLocation } from "react-router-dom";
import FontAwesome from "react-fontawesome";
import { StopData, TrimetRoute } from "../../../api/trimet/interfaces/types";
import { ArrivalLocation } from "../../../api/trimet/interfaces/arrivals";
import { TrimetRoute as DetailedRoute } from "../../../api/trimet/interfaces/routes";
import { DirectionsSelection } from "../util/mapbox/directionsSelection";
import { TripCorridor } from "@overworld/places/discovery";
import { ConnectedTripPlannerView } from "../../tripPlanner/TripPlannerView";
import NearbySimpleRoutes from "./NearbySimpleRoutes";
import NearbySimpleRouteArrivals from "./NearbySimpleRouteArrivals";
import { NearbyStopsDetail } from "./NearbyStopsDetail";
import NearbyStops from "./NearbyStops";
import NearbyRoutes from "./NearbyRoutes";
import NearbyDirections from "./NearbyDirections";
import NearbyPlannerPaths from "./NearbyPlannerPaths";
import NearbyPlaceDestination from "./NearbyPlaceDestination";

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
  discoverPlacesAlongTrip?: (trip: TripCorridor) => void;
}

export function NearbyTripPlannerComponent() {
  const { plannerMap, plannerMapSuspended, plannerFooter, walkingEnabled, discoverPlacesAlongTrip } = useOutletContext<NearbyViewComponentOutletContextProps>();
  const location = useLocation();
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
          onDiscoverPlaces={discoverPlacesAlongTrip ? trip => discoverPlacesAlongTrip({
            ...trip, returnTo: `${location.pathname}${location.search}`
          }) : undefined}
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

export function NearbyLauncher() {
  return (
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
  );
}
