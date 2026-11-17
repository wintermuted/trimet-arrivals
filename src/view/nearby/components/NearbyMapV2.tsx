import React, { useEffect } from "react";
import { Button } from "@wintermuted/ui-theme/react";
import FontAwesome from "react-fontawesome";
import { SearchRadiusSelection } from "./SearchRadiusSelection";

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
  searchMode: "none" | "device" | "area" | "pin";
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
  searchMode
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

  const mapBoxMap = (
    <div className="transit-nearby-map-canvas" ref={mapContainerRef} />
  );

  return (
    <div className="transit-nearby-map">
      {mapBoxMap}
      <div className="sidebar transit-nearby-map-controls">
        <span className="transit-map-location-status" role="status">
          <FontAwesome
            name={searchMode === "pin" ? "map-marker" : searchMode === "device" ? "location-arrow" : "map"}
            aria-hidden="true"
          />
          {searchMode === "pin" ? "Dropped pin" :
            searchMode === "area" ? "Map center" :
              searchMode === "device" ? "Near me" : "Choose area"}
        </span>
        <div className="transit-nearby-map-actions">
          <SearchRadiusSelection
            compact
            radiusSize={radiusSize}
            handleRadiusSelectionChange={onRadiusChange}
          />
          <Button type="button" variant="secondary" className="transit-map-control-button" onClick={onSearchArea} title="Search this area" aria-label="Search this area">
            <FontAwesome name="search" aria-hidden="true" />
          </Button>
          <Button type="button" variant="secondary" className="transit-map-control-button" onClick={onDropPin} title="Drop a pin at the map center" aria-label="Drop a pin at the map center">
            <FontAwesome name="map-marker" aria-hidden="true" />
          </Button>
          <Button type="button" variant="secondary" className="transit-map-control-button" onClick={onFindMe} disabled={isLocating} title="Find near me" aria-label={isLocating ? "Finding your location" : "Find near me"}>
            <FontAwesome name={isLocating ? "spinner" : "location-arrow"} spin={isLocating} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NearbyMapV2;
