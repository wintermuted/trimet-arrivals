import React, { useEffect } from "react";

export type LatLngCoords = number[];

interface Props {
  zoom: number;
  mapRef: any;
  mapContainerRef: any;
  currentLocation: LatLngCoords;
  initializeMap: () => void;
}

function NearbyMapV2({
  zoom,
  currentLocation,
  initializeMap,
  mapContainerRef,
  mapRef
}: Props) {
  const lng = currentLocation[0];
  const lat = currentLocation[1];

  // Initialize Map
  useEffect(() => {
    initializeMap();
    const observer = new ResizeObserver(() => mapRef.current?.resize());
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const mapBoxMap = (
    <div className="transit-nearby-map-canvas" ref={mapContainerRef} />
  );

  return (
    <div className="transit-nearby-map">
      {mapBoxMap}
      <div className="sidebar">
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>
    </div>
  );
}

export default NearbyMapV2;
