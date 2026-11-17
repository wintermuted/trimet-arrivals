import React, { useEffect } from "react";
import { Button } from "@wintermuted/ui-theme/react";

export type LatLngCoords = number[];

interface Props {
  mapRef: any;
  mapContainerRef: any;
  initializeMap: () => void;
  onSearchArea: () => void;
  onDropPin: () => void;
  onFindMe: () => void;
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
        <span role="status">
          {searchMode === "pin" ? "Searching from a dropped pin. Drag it to move the search." :
            searchMode === "area" ? "Searching from the selected map center." :
              searchMode === "device" ? "Searching near your location." : "Move the map to choose a search area."}
        </span>
        <div className="transit-nearby-map-actions">
          <Button type="button" size="sm" onClick={onSearchArea}>Search this area</Button>
          <Button type="button" size="sm" onClick={onDropPin}>Drop pin at map center</Button>
          <Button type="button" size="sm" onClick={onFindMe} disabled={isLocating}>
            {isLocating ? "Finding location…" : "Find near me"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NearbyMapV2;
