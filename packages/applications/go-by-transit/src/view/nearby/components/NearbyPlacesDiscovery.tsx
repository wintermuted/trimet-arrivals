import React from "react";
import { Button } from "@wintermuted/ui-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Map } from "mapbox-gl";
import { placeDetailLink } from "@overworld/places/catalog";
import { LINE_OVERLAY_CATEGORIES } from "@overworld/places/lineOverlays";
import { CONTEXT_CATEGORIES } from "@overworld/places/contextOverlays";
import { placesPreset } from "@overworld/places/discovery";
import { NearbyPlacesDiscovery } from "./useNearbyPlacesDiscovery";
import NearbyPlaces from "./NearbyPlaces";
import NearbyNeighborhoodsMap from "./NearbyNeighborhoodsMap";
import NearbyLineOverlayMap from "./NearbyLineOverlayMap";
import NearbyContextMap from "./NearbyContextMap";
import NearbyPlacesMap from "./NearbyPlacesMap";
import NearbyDiscoveryControls from "./NearbyDiscoveryControls";
import NearbyTripCorridorMap from "./NearbyTripCorridorMap";

export function NearbyPlacesSidebar({ discovery, selectedPlaceId, currentLocation, searchMode }: {
  discovery: NearbyPlacesDiscovery;
  selectedPlaceId?: string;
  currentLocation: number[];
  searchMode: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    coincidentIds, mappedPlaces, retainedViewSearch, setCoincidentIds, selectedPlace,
    selectedSource, selectedCategory, placeCatalog, placeFilters, setPlaceFilters,
    visiblePlaces, selectPlace, savedPlaces, placesScope, currentPlacesView, applyPlacesView,
    setSavedOnly, setAlongTrip, sharedPlacesView, shareSearch, savedOnly, unavailableSaved,
    tripCorridor, alongTrip, tripDistance, setTripDistance, tripMapError, setTripMapRevision,
    contextShown, contextSources, contextErrors, setContextShown, setContextRevisions,
    lineOverlaysShown, lineOverlaySources, lineOverlayErrors, setLineOverlaysShown,
    setLineOverlayRevisions, neighborhoods, neighborhoodsShown, setNeighborhoodsShown,
    neighborhoodPolygonsShown, setNeighborhoodPolygonsShown, neighborhoodMapError,
    setNeighborhoodLayerRevision, placeMapError, setPlaceMapRevision, placeBounds
  } = discovery;
  return (
    <>
      {coincidentIds.length > 1 && <section aria-label="Locations at this point">
        <h3>Locations at this point</h3>
        {mappedPlaces.filter(place => coincidentIds.includes(place.id)).map(place =>
          <Link key={place.id} className="wm-btn wm-btn-secondary" to={placeDetailLink(place.id, retainedViewSearch)}>{place.name}</Link>)}
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
        savedPlaces={savedPlaces} viewSearch={retainedViewSearch}
        areaLabel={placesScope}
        discovery={<>
          <NearbyDiscoveryControls view={currentPlacesView} onPreset={preset => {
            applyPlacesView(placesPreset(preset));
            if (preset === "default") { setSavedOnly(false); setAlongTrip(false); }
            if (sharedPlacesView.error) navigate(location.pathname, { replace: true });
          }} viewError={sharedPlacesView.error} shareHref={`/nearby/places${shareSearch}`}
            savedPlaces={savedPlaces} savedOnly={savedOnly} onSavedOnly={setSavedOnly}
            unavailable={unavailableSaved}
            trip={tripCorridor} alongTrip={alongTrip} onAlongTrip={setAlongTrip}
            distance={tripDistance} onDistance={setTripDistance} />
          {alongTrip && tripMapError && <p role="alert">The mapped trip could not be drawn. Distance filtering still uses its geometry.{" "}
            <Button size="sm" variant="secondary" onClick={() => setTripMapRevision(value => value + 1)}>Retry trip line</Button>
          </p>}
        </>}
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
        origin={currentLocation} originMode={searchMode} onRetry={placeCatalog.retry} mapError={placeMapError}
        onRetryMap={() => setPlaceMapRevision(value => value + 1)} mapReady={Boolean(placeBounds)} />}
    </>
  );
}

export function NearbyPlacesLayers({ discovery, map, selectedPlaceId }: {
  discovery: NearbyPlacesDiscovery;
  map: Map;
  selectedPlaceId?: string;
}) {
  const {
    neighborhoodsShown, neighborhoods, neighborhoodLayerRevision, neighborhoodPolygonsShown,
    setNeighborhoodMapError, lineOverlaysShown, lineOverlaySources, lineOverlayRevisions,
    handleLineOverlayError, contextShown, contextSources, contextRevisions, handleContextError,
    placeMapRevision, mappedPlaces, selectPlace, setCoincidentIds, updatePlaceBounds,
    setPlaceMapError, alongTrip, tripCorridor, tripMapRevision, setTripMapError
  } = discovery;
  return (
    <>
      {neighborhoodsShown && neighborhoods.snapshot &&
        <NearbyNeighborhoodsMap key={neighborhoodLayerRevision} map={map}
          snapshot={neighborhoods.snapshot} polygonsShown={neighborhoodPolygonsShown} onError={setNeighborhoodMapError} />}
      {LINE_OVERLAY_CATEGORIES.map(category =>
        lineOverlaysShown[category] && lineOverlaySources[category].snapshot &&
        <NearbyLineOverlayMap key={`${category}-${lineOverlayRevisions[category]}`} map={map}
          snapshot={lineOverlaySources[category].snapshot} onError={handleLineOverlayError} />)}
      {CONTEXT_CATEGORIES.map(category =>
        contextShown[category] && contextSources[category].snapshot &&
        <NearbyContextMap key={`${category}-${contextRevisions[category]}`} map={map}
          snapshot={contextSources[category].snapshot} onError={handleContextError} />)}
      <NearbyPlacesMap key={`places-${placeMapRevision}`} map={map} places={mappedPlaces}
        selectedId={selectedPlaceId} onSelect={selectPlace} onCoincident={setCoincidentIds}
        onBounds={updatePlaceBounds} onError={setPlaceMapError} />
      {alongTrip && tripCorridor &&
        <NearbyTripCorridorMap key={tripMapRevision} map={map} lines={tripCorridor.lines} onError={setTripMapError} />}

    </>
  );
}
