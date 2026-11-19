import { Button } from "@wintermuted/ui-theme/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import FontAwesome from "react-fontawesome";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { placeIconDefinition } from "../util/mapbox/placeIcons";
import { Link } from "react-router-dom";
import {
  categoryName, InterestPlace, PLACE_CATEGORIES, PLACE_INFO, PlaceCategory,
  PlaceFilters, PlaceSourceState, placeDetailLink, placePlannerLink
} from "../../../api/places/places";
import "./NearbyPlaces.scss";
import { NeighborhoodState } from "../../../api/places/neighborhoods";

interface Props {
  sources: Record<PlaceCategory, PlaceSourceState>;
  filters: PlaceFilters;
  onFilters: (filters: PlaceFilters) => void;
  visiblePlaces: InterestPlace[];
  selected?: InterestPlace;
  onSelect: (id?: string, pan?: boolean) => void;
  origin?: number[];
  originMode?: string;
  onRetry: (category: PlaceCategory) => void;
  mapError: boolean;
  mapReady: boolean;
  neighborhoods?: NeighborhoodState & {
    shown: boolean;
    onShown: (shown: boolean) => void;
    polygonsShown: boolean;
    onPolygonsShown: (shown: boolean) => void;
    mapError: boolean;
    onRetry: () => void;
  };
}

export default function NearbyPlaces({
  sources, filters, onFilters, visiblePlaces, selected, onSelect, origin, originMode, onRetry, mapError, mapReady, neighborhoods
}: Props) {
  const [limit, setLimit] = useState(40);
  const heading = useRef<HTMLHeadingElement>(null);
  const browseHeading = useRef<HTMLHeadingElement>(null);
  const results = useRef<HTMLUListElement>(null);
  const previousSelection = useRef<string>();
  useEffect(() => {
    if (selected) heading.current?.focus();
    else if (previousSelection.current) {
      const result = Array.from(results.current?.querySelectorAll<HTMLAnchorElement>("a[data-place-id]") || [])
        .find(link => link.dataset.placeId === previousSelection.current);
      (result || browseHeading.current)?.focus();
    }
    previousSelection.current = selected?.id;
  }, [selected?.id]);
  const sorted = useMemo(() => [...visiblePlaces].sort((a, b) => a.name.localeCompare(b.name)), [visiblePlaces]);
  useEffect(() => setLimit(40), [filters]);
  const loading = PLACE_CATEGORIES.some(category => sources[category].loading && filters[category]);
  const available = PLACE_CATEGORIES.some(category => sources[category].snapshot && filters[category]);

  return (
    <section className="transit-places" aria-labelledby={selected ? "selected-place-heading" : "nearby-places-heading"}>
      {!selected && <>
      <header className="transit-places-header">
        <h2 id="nearby-places-heading" ref={browseHeading} tabIndex={-1}>Places nearby</h2>
        <p>Explore Portland places and practical stops. Filter by category or move the map to explore another area.</p>
      </header>
      <fieldset className="transit-places-filters">
        <legend className="wm-sr-only">Place categories</legend>
        {PLACE_CATEGORIES.map(category => (
          <label key={category} className={`transit-places-category transit-places-category--${category}`}>
            <input type="checkbox" checked={filters[category]}
              onChange={event => onFilters({ ...filters, [category]: event.target.checked })} />
            <FontAwesomeIcon icon={placeIconDefinition(category)} aria-hidden="true" />
            {categoryName(category)}
          </label>
        ))}
      </fieldset>
      {neighborhoods && <fieldset className="transit-places-map-layers">
        <legend>Map layers</legend>
        <label className="transit-places-category">
          <input type="checkbox" checked={neighborhoods.shown} aria-describedby="neighborhood-layer-help"
            onChange={event => neighborhoods.onShown(event.target.checked)} />
          <FontAwesome name="map-o" aria-hidden="true" />
          Portland neighborhoods
        </label>
        <p id="neighborhood-layer-help">Boundaries and names; shared areas may overlap.</p>
        {neighborhoods.shown && <label className="transit-places-category transit-places-polygon-toggle">
          <input type="checkbox" checked={neighborhoods.polygonsShown}
            onChange={event => neighborhoods.onPolygonsShown(event.target.checked)} />
          Show neighborhood polygons
        </label>}
      </fieldset>}
      <label className="transit-places-search">
        Search places in this map area
        <input type="search" className="wm-input" value={filters.search} maxLength={200}
          onChange={event => onFilters({ ...filters, search: event.target.value })} />
      </label>
      </>}
      {neighborhoods?.shown && <>
        {neighborhoods.loading && <p role="status">Loading neighborhood boundaries...</p>}
        {(neighborhoods.error || neighborhoods.mapError) && <div role="alert" className="transit-places-message">
          <p>Neighborhood boundaries could not be {neighborhoods.error ? "loaded" : "drawn"}. Other places remain usable.
            {neighborhoods.error && neighborhoods.snapshot && " The previously loaded boundaries are still shown."}</p>
          <Button size="sm" variant="secondary" onClick={neighborhoods.onRetry}>Retry neighborhoods</Button>
        </div>}
      </>}
      {PLACE_CATEGORIES.map(category => sources[category].error && (
        <div role="alert" key={category} className="transit-places-message">
          <p>{categoryName(category)} could not be loaded.
            {sources[category].snapshot ? " The previously loaded snapshot is still shown." : " Other available places remain usable."}</p>
          <Button size="sm" variant="secondary" onClick={() => onRetry(category)}>Retry {categoryName(category).toLowerCase()}</Button>
        </div>
      ))}
      {loading && <p role="status">Loading places...</p>}
      {mapError && <p role="alert">Place markers could not be drawn. You can still select places from this list. Reopen Places to retry the map layer.</p>}
      {selected && (
        <section className="transit-place-detail" aria-labelledby="selected-place-heading">
          <div className="transit-place-detail-heading">
            <h2 id="selected-place-heading" ref={heading} tabIndex={-1}>{selected.name}</h2>
          </div>
          <p><FontAwesomeIcon icon={placeIconDefinition(selected.category)} aria-hidden="true" />{" "}
            {PLACE_INFO[selected.category].singular}</p>
          {selected.address && <p>{selected.address}</p>}
          {selected.category === "public-restroom" && <section aria-label="Restroom access">
            <h3>Source-listed access</h3>
            <p><strong>Status:</strong> {selected.restroomStatus === "listed-24-7" ? "Listed 24/7 in the source; not verified." : "Opening status unknown."}</p>
            <p><strong>ADA designation:</strong> {selected.restroomAda === "yes" ? "Yes (source-listed)" : selected.restroomAda === "no" ? "No (source-listed)" : "Unknown"}</p>
            <p>Not live availability or a verified accessible route. Seasonal closures, fees, or building access restrictions may apply. Check with Portland Parks before relying on this stop.</p>
          </section>}
          {selected.category === "heritage-tree" && <section aria-label="Heritage tree access">
            {selected.scientificName && <p><em>{selected.scientificName}</em></p>}
            {selected.treeOwnership && <p><strong>Source-listed setting:</strong> {selected.treeOwnership}</p>}
            <p>This point marks the tree trunk, not a public entrance. Trees may be on private land or not visible from public paths. View only from lawful public access; do not enter private property.</p>
          </section>}
          {selected.category === "community-garden" && <p>Garden plots may require registration and have restricted access. Check with Portland Parks before visiting.</p>}
          {selected.category === "farmers-market" && <section aria-label="Market schedule">
            <h3>Source-listed schedule</h3>
            <p>This snapshot may contain older seasonal dates and hours. Check the market website before traveling; this is not live opening information.</p>
            {selected.marketDays && <p><strong>Days:</strong> {selected.marketDays}</p>}
            {selected.marketSeason && <p><strong>Season:</strong> {selected.marketSeason}</p>}
            {selected.marketHours && <p><strong>Hours:</strong> {selected.marketHours}</p>}
          </section>}
          <p>Approximate map location, not a verified public entrance. Confirm your arrival point before finding trips.</p>
          <Link className="wm-btn wm-btn-primary" to={placePlannerLink(selected, origin, originMode)}>Plan a trip here</Link>
          <p className="transit-place-source">
            <a href={selected.sourceUrl} target="_blank" rel="noreferrer">View source location</a>
            {selected.website && <> · <a href={selected.website} target="_blank" rel="noreferrer">Website</a></>}
            {sources[selected.category].snapshot?.sourceUpdatedAt && <><br />
              Source data as of {new Date(sources[selected.category].snapshot.sourceUpdatedAt).toLocaleDateString()}.
            </>}
          </p>
        </section>
      )}
      {!selected && <>
      {!PLACE_CATEGORIES.some(category => filters[category]) ? (
        <p role="status">Choose a category to show places.</p>
      ) : !mapReady ? (
        <p role="status">Preparing the map area...</p>
      ) : available && !loading && sorted.length === 0 ? (
        <p role="status">No matching places in this map area. Try a wider map view, another search, or enable more categories. Coverage is limited to the Portland parks system and mapped Portland places.</p>
      ) : null}
      <p className="transit-places-count" role="status">{sorted.length} {sorted.length === 1 ? "place" : "places"} in map area</p>
      <ul ref={results} className="transit-places-list" aria-label="Places in map area">
        {sorted.slice(0, limit).map(place => (
          <li key={place.id}>
            <Link to={placeDetailLink(place.id)} className="transit-place-result" data-place-id={place.id}
              onClick={event => {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                onSelect(place.id, true);
              }}>
              <FontAwesomeIcon icon={placeIconDefinition(place.category)} aria-hidden="true"
                className={`transit-place-icon transit-place-icon--${place.category}`} />
              <span><strong>{place.name}</strong><small>{place.address || PLACE_INFO[place.category].singular}</small></span>
              <FontAwesome name="angle-right" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      {sorted.length > limit && <Button variant="secondary" onClick={() => setLimit(value => value + 40)}>Show more places ({sorted.length - limit} remaining)</Button>}
      </>}
      <details className="transit-places-notices">
        <summary>Data sources and coverage</summary>
        <p>Snapshots are not live listings. Access, entrances, and opening hours are not verified. Mapped places may be missing or out of date.</p>
        <p>Regional Land Information System data are a product of Metro and made publicly available according to the{" "}
          <a href="https://rlisdiscovery.oregonmetro.gov/pages/open-database-license" target="_blank" rel="noreferrer">RLIS license agreement</a>.</p>
        {PLACE_CATEGORIES.map(category => {
          const snapshot = sources[category].snapshot;
          return snapshot && <p key={category}>
            <strong>{categoryName(category)}</strong><br />
            <a href={snapshot.sourceUrl} target="_blank" rel="noreferrer">{snapshot.source}</a>
            {" · "}<a href={snapshot.licenseUrl} target="_blank" rel="noreferrer">{snapshot.license}</a><br />
            Retrieved {new Date(snapshot.retrievedAt).toLocaleDateString()}.
            {snapshot.sourceUpdatedAt && <> Source data as of {new Date(snapshot.sourceUpdatedAt).toLocaleDateString()}.</>}
            {" "}{snapshot.coverage}
          </p>;
        })}
        {neighborhoods?.snapshot && <p>
          <strong>Portland neighborhoods</strong><br />
          <a href={neighborhoods.snapshot.sourceUrl} target="_blank" rel="noreferrer">{neighborhoods.snapshot.source}</a>
          {" · "}<a href={neighborhoods.snapshot.licenseUrl} target="_blank" rel="noreferrer">{neighborhoods.snapshot.license}</a><br />
          Retrieved {new Date(neighborhoods.snapshot.retrievedAt).toLocaleDateString()}. {neighborhoods.snapshot.coverage}
        </p>}
      </details>
    </section>
  );
}
