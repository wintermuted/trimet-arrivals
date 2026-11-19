import React, { useEffect } from "react";
import { Button } from "@wintermuted/ui-theme/react";
import FontAwesome from "react-fontawesome";
import { SearchRadiusSelection } from "./SearchRadiusSelection";
import { VehicleFeed } from "../util/useVehiclePositions";

export type LatLngCoords = number[];

interface Props {
  mapRef: any;
  mapContainerRef: any;
  initializeMap: () => void;
  onSearchArea: () => void;
  onDropPin: () => void;
  onFindMe: () => void;
  radiusSize: number;
  onRadiusChange: React.ChangeEventHandler<HTMLSelectElement>;
  isLocating: boolean;
  isMapLoading: boolean;
  searchMode: "none" | "device" | "area" | "pin";
  vehiclesEnabled: boolean;
  onVehiclesToggle: () => void;
  vehicleFeed: VehicleFeed;
  vehicleMapError: boolean;
  onVehiclesRetry: () => void;
  children?: React.ReactNode;
  placesMode?: boolean;
  placesScope?: "map area" | "saved view" | "trip corridor";
}

export function NearbyMapSkeleton({ message }: { message: string }) {
  return (
    <div className="transit-nearby-map-skeleton" role="status">
      <span>{message}</span>
    </div>
  );
}

function NearbyMapV2({
  initializeMap,
  mapContainerRef,
  mapRef,
  onSearchArea,
  onDropPin,
  onFindMe,
  radiusSize,
  onRadiusChange,
  isLocating,
  isMapLoading,
  searchMode,
  vehiclesEnabled,
  onVehiclesToggle,
  vehicleFeed,
  vehicleMapError,
  onVehiclesRetry,
  children,
  placesMode = false,
  placesScope = "map area"
}: Props) {
  // Initialize Map
  useEffect(() => {
    initializeMap();
    const map = mapRef.current;
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(mapContainerRef.current);
    return () => {
      observer.disconnect();
      map.remove();
    };
  }, []);

  const vehicleProblem = vehicleMapError || vehicleFeed.status === "error" || vehicleFeed.status === "delayed";
  const vehicleMessage = vehicleMapError ? "Vehicle symbols could not be displayed." :
    vehicleFeed.message || {
      loading: "Loading vehicle positions...",
      current: "Reported vehicle positions",
      empty: "No vehicles in this view.",
      delayed: "Waiting for fresh vehicle reports.",
      error: "Vehicle updates are unavailable.",
      paused: "Vehicle updates paused.",
    }[vehicleFeed.status];

  return (
    <div className="transit-nearby-map">
      <div className="transit-nearby-map-stage">
        <div className="transit-nearby-map-canvas" ref={mapContainerRef} />
        {isMapLoading && <NearbyMapSkeleton message="Loading map…" />}
      </div>
      <div className="sidebar transit-nearby-map-controls">
        <span className="transit-map-location-status" role="status">
          <FontAwesome
            name={searchMode === "pin" ? "map-marker" : searchMode === "device" ? "location-arrow" : "map"}
            aria-hidden="true"
          />
          {placesMode ? `Places in ${placesScope}` : searchMode === "pin" ? "Dropped pin" :
            searchMode === "area" ? "Map center" :
              searchMode === "device" ? "Near me" : "Choose area"}
        </span>
        <div className="transit-nearby-map-actions">
          <Button type="button" variant={vehiclesEnabled ? "primary" : "secondary"}
            className="transit-map-vehicles-toggle" aria-pressed={vehiclesEnabled}
            onClick={onVehiclesToggle}>
            <FontAwesome name="bus" aria-hidden="true" /> Vehicles
          </Button>
          {!placesMode && <SearchRadiusSelection
            compact
            radiusSize={radiusSize}
            handleRadiusSelectionChange={onRadiusChange}
          />}
          {!placesMode && <Button type="button" variant="secondary" className="transit-map-control-button" onClick={onSearchArea} title="Search this area" aria-label="Search this area">
            <FontAwesome name="search" aria-hidden="true" />
          </Button>}
          {!placesMode && <Button type="button" variant="secondary" className="transit-map-control-button" onClick={onDropPin} title="Drop a pin at the map center" aria-label="Drop a pin at the map center">
            <FontAwesome name="map-marker" aria-hidden="true" />
          </Button>}
          <Button type="button" variant="secondary" className="transit-map-control-button" onClick={onFindMe} disabled={isLocating} title="Find near me" aria-label={isLocating ? "Finding your location" : "Find near me"}>
            <FontAwesome name={isLocating ? "spinner" : "location-arrow"} spin={isLocating} aria-hidden="true" />
          </Button>
        </div>
      </div>
      {vehiclesEnabled && (
        <div className="transit-vehicle-status">
            <span role="status">{vehicleMessage}</span>
            {vehicleFeed.updatedAt && !vehicleMapError && (
              <small>Updated <time dateTime={new Date(vehicleFeed.updatedAt).toISOString()}>
                {new Date(vehicleFeed.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}
              </time></small>
            )}
            {vehicleProblem && <Button type="button" size="sm" variant="secondary" onClick={onVehiclesRetry}>Retry vehicles</Button>}
            {children}
            <span className="transit-vehicle-legend" aria-label="Vehicle symbols: bus and train">
              <FontAwesome name="bus" aria-hidden="true" /> Bus
              <FontAwesome name="train" aria-hidden="true" /> Train
            </span>
        </div>
      )}
    </div>
  );
}

export default NearbyMapV2;
