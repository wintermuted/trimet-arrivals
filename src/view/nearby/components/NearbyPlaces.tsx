import { Button } from "@wintermuted/ui-theme/react";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
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
import { LINE_OVERLAY_CATEGORIES, LINE_OVERLAY_INFO, LineOverlayControls } from "../../../api/places/lineOverlays";
import { CONTEXT_CATEGORIES, CONTEXT_OVERLAY_INFO, ContextControls } from "../../../api/places/contextOverlays";
import { SavedPlaceControls } from "../../../api/places/savedPlaces";
import PlacesHelp from "./PlacesHelp";

const CATEGORY_GROUPS: { label: string; categories: PlaceCategory[] }[] = [
  { label: "Parks & nature", categories: ["park", "community-garden", "heritage-tree", "park-artwork"] },
  { label: "Food & markets", categories: ["food-cart-pod", "farmers-market", "grocery-store", "csa-pickup"] },
  { label: "Community & resources", categories: ["community-center", "library", "reuse-repair"] },
  { label: "Trip amenities", categories: ["public-restroom", "bicycle-parking", "drinking-fountain", "picnic-seating"] }
];

const LINE_OVERLAY_HELP = "Optional reference lines, not turn-by-turn routes. Trail access, bike permissions, directions, and closures are not verified.";
const CONTEXT_LAYER_HELP = {
  "street-trees": "Street trees do not establish shade or public access.",
  sidewalks: "Sidewalk gaps do not prove absence.",
  crossings: "Crossing points do not guarantee safety or accessibility.",
  "crossing-deficiencies": "Orange points mark planning deficiencies, not live closures."
};

function MapLayerHelp({ label, text }: { label: string; text: string }) {
  return <span className="transit-places-layer-help">
    <PlacesHelp label={label.toLowerCase()} text={text} />
  </span>;
}

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
  lineOverlays?: LineOverlayControls;
  contextOverlays?: ContextControls;
  discovery?: React.ReactNode;
  savedPlaces?: SavedPlaceControls;
  viewSearch?: string;
  areaLabel?: string;
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
  sources, filters, onFilters, visiblePlaces, selected, onSelect, origin, originMode, onRetry, mapError, mapReady, neighborhoods, lineOverlays, contextOverlays,
  discovery, savedPlaces, viewSearch = "", areaLabel = "map area"
}: Props) {
  const [limit, setLimit] = useState(40);
  const [sections, setSections] = useState({ discovery: false, categories: false, layers: false });
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const groupId = useId();
  function toggleSection(section: keyof typeof sections, open: boolean) {
    setSections(previous => previous[section] === open ? previous : { ...previous, [section]: open });
  }
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
      <h2 id="nearby-places-heading" className="wm-sr-only" ref={browseHeading} tabIndex={-1}>Places nearby</h2>
      {discovery && <details className="transit-places-section" open={sections.discovery}
        onToggle={event => toggleSection("discovery", event.currentTarget.open)}>
        <summary>Discovery tools</summary>
        {discovery}
      </details>}
      <details className="transit-places-section" open={sections.categories}
        onToggle={event => toggleSection("categories", event.currentTarget.open)}>
      <summary>Place categories</summary>
      <fieldset className="transit-places-filters">
        <legend className="wm-sr-only">Place categories</legend>
        {CATEGORY_GROUPS.map((group, index) => {
          const all = group.categories.every(category => filters[category]);
          const some = group.categories.some(category => filters[category]);
          const expanded = expandedGroups.includes(group.label);
          const childrenId = `${groupId}-categories-${index}`;
          return <fieldset key={group.label} className="transit-places-category-group">
            <legend className="wm-sr-only">{group.label}</legend>
            <div className="transit-places-group-header">
              <label className="transit-places-category transit-places-group-bulk">
                <input type="checkbox" checked={all} aria-label={`Toggle all ${group.label.toLowerCase()}`}
                  ref={input => { if (input) input.indeterminate = some && !all; }}
                  onChange={event => {
                    const next = { ...filters };
                    group.categories.forEach(category => { next[category] = event.target.checked; });
                    onFilters(next);
                  }} />
              </label>
              <button type="button" className="transit-places-group-toggle" aria-expanded={expanded}
                aria-controls={childrenId} onClick={() => setExpandedGroups(previous => expanded
                  ? previous.filter(label => label !== group.label) : [...previous, group.label])}>
                {group.label}
                <FontAwesome name={expanded ? "caret-down" : "caret-right"} aria-hidden="true" />
              </button>
            </div>
            <div id={childrenId} className="transit-places-group-children" hidden={!expanded}>
              {group.categories.map(category => (
                <label key={category} className={`transit-places-category transit-places-category--${category}`}>
                  <input type="checkbox" checked={filters[category]}
                    onChange={event => onFilters({ ...filters, [category]: event.target.checked })} />
                  <FontAwesomeIcon icon={placeIconDefinition(category)} aria-hidden="true" />
                  {categoryName(category)}
                </label>
              ))}
            </div>
          </fieldset>;
        })}
      </fieldset>
      </details>
      {neighborhoods && <details className="transit-places-section" open={sections.layers}
        onToggle={event => toggleSection("layers", event.currentTarget.open)}>
      <summary>Map layers</summary>
      <fieldset className="transit-places-map-layers">
        <legend className="wm-sr-only">Map layers</legend>
        <div className="transit-places-layer-row">
        <label className="transit-places-category">
          <input type="checkbox" checked={neighborhoods.shown}
            onChange={event => neighborhoods.onShown(event.target.checked)} />
          <FontAwesome name="map-o" aria-hidden="true" />
          Portland neighborhoods
        </label>
        <MapLayerHelp label="Portland neighborhoods" text="Boundaries and names; shared areas may overlap." />
        </div>
        {neighborhoods.shown && <label className="transit-places-category transit-places-polygon-toggle">
          <input type="checkbox" checked={neighborhoods.polygonsShown}
            onChange={event => neighborhoods.onPolygonsShown(event.target.checked)} />
          Show neighborhood polygons
        </label>}
        {lineOverlays && LINE_OVERLAY_CATEGORIES.map(category => <div key={category} className="transit-places-layer-row">
          <label className="transit-places-category transit-places-line-toggle">
          <input type="checkbox" checked={lineOverlays.shown[category]}
            onChange={event => lineOverlays.onShown(category, event.target.checked)} />
          <span aria-hidden="true" className={`transit-place-line-swatch transit-place-line-swatch--${category}`}
            style={{ borderColor: LINE_OVERLAY_INFO[category].color }} />
          {LINE_OVERLAY_INFO[category].label}
          </label>
          <MapLayerHelp label={LINE_OVERLAY_INFO[category].label} text={LINE_OVERLAY_HELP + (
            category === "bicycle-network" ? " Blue shows active mixed bicycle facilities only; future and retired segments are excluded." :
            category === "recommended-bike-routes" ? " Red dashes: difficult, higher-traffic or unclassified connections. A recommendation is not a safety guarantee." : ""
          )} />
        </div>)}
        {contextOverlays && CONTEXT_CATEGORIES.map(category => <React.Fragment key={category}>
          <div className="transit-places-layer-row">
          <label className="transit-places-category transit-places-line-toggle transit-places-context-toggle">
            <input type="checkbox" checked={contextOverlays.shown[category]}
              onChange={event => contextOverlays.onShown(category, event.target.checked)} />
            <span aria-hidden="true" className={`transit-place-context-swatch transit-place-context-swatch--${category}`}
              style={{ color: CONTEXT_OVERLAY_INFO[category].color }} />
            {CONTEXT_OVERLAY_INFO[category].label}
          </label>
          <MapLayerHelp label={CONTEXT_OVERLAY_INFO[category].label}
            text={`Inventory context, not routing destinations. Hover for source details. ${CONTEXT_LAYER_HELP[category]}`} />
          </div>
          {contextOverlays.shown[category] && contextOverlays.sources[category].zoomRequired &&
            <p role="status">Zoom in to level {CONTEXT_OVERLAY_INFO[category].minZoom} or closer to see {CONTEXT_OVERLAY_INFO[category].label.toLowerCase()}.</p>}
        </React.Fragment>)}
      </fieldset>
      </details>}
      <label className="transit-places-search">
        Search places in this {areaLabel}
        <input type="search" className="wm-input" value={filters.search} maxLength={200}
          onChange={event => onFilters({ ...filters, search: event.target.value })} />
      </label>
      </>}
      {savedPlaces?.error && <div role="alert" className="transit-places-message">
        <p>{savedPlaces.error}</p>
        <Button size="sm" variant="secondary" onClick={savedPlaces.retry}>Retry saved places</Button>
      </div>}
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
      {lineOverlays && LINE_OVERLAY_CATEGORIES.map(category => lineOverlays.shown[category] && <React.Fragment key={category}>
        {lineOverlays.sources[category].loading && <p role="status">Loading {LINE_OVERLAY_INFO[category].label.toLowerCase()}...</p>}
        {(lineOverlays.sources[category].error || lineOverlays.mapErrors[category]) && <div role="alert" className="transit-places-message">
          <p>{LINE_OVERLAY_INFO[category].label} could not be {lineOverlays.sources[category].error ? "loaded" : "drawn"}. Other map layers and places remain usable.
            {lineOverlays.sources[category].error && lineOverlays.sources[category].snapshot && " The previously loaded snapshot is still shown."}</p>
          <Button size="sm" variant="secondary" onClick={() => lineOverlays.onRetry(category)}>Retry {LINE_OVERLAY_INFO[category].label.toLowerCase()}</Button>
        </div>}
      </React.Fragment>)}
      {mapError && <p role="alert">Place markers could not be drawn. You can still select places from this list. Reopen Places to retry the map layer.</p>}
      {contextOverlays && CONTEXT_CATEGORIES.map(category => contextOverlays.shown[category] && <React.Fragment key={category}>
        {contextOverlays.sources[category].loading && <p role="status">Loading {CONTEXT_OVERLAY_INFO[category].label.toLowerCase()} in this map area...</p>}
        {(contextOverlays.sources[category].error || contextOverlays.mapErrors[category]) && <div role="alert" className="transit-places-message">
          <p>{CONTEXT_OVERLAY_INFO[category].label} could not be {contextOverlays.sources[category].error ? "loaded" : "drawn"}. Other places and layers remain usable.
            {contextOverlays.sources[category].snapshot && " A previously loaded area may still be shown."}</p>
          <Button size="sm" variant="secondary" onClick={() => contextOverlays.onRetry(category)}>Retry {CONTEXT_OVERLAY_INFO[category].label.toLowerCase()}</Button>
        </div>}
      </React.Fragment>)}
      {selected && (
        <section className="transit-place-detail" aria-labelledby="selected-place-heading">
          <div className="transit-place-detail-heading">
            <h2 id="selected-place-heading" ref={heading} tabIndex={-1}>{selected.name}</h2>
          </div>
          <p><FontAwesomeIcon icon={placeIconDefinition(selected.category)} aria-hidden="true" />{" "}
            {PLACE_INFO[selected.category].singular}</p>
          {savedPlaces && <Button size="sm" variant="secondary" aria-pressed={Boolean(savedPlaces.saved[selected.id])}
            onClick={() => savedPlaces.toggle(selected)}>
            <FontAwesome name={savedPlaces.saved[selected.id] ? "bookmark" : "bookmark-o"} aria-hidden="true" />{" "}
            {savedPlaces.saved[selected.id] ? "Remove saved place" : "Save place"}
          </Button>}
          {selected.address && <p>{selected.address}</p>}
          {["drinking-fountain", "picnic-seating", "park-artwork"].includes(selected.category) && <section aria-label="Park amenity information">
            <h3>Source-listed amenity</h3>
            <p>{selected.amenityStyle || selected.amenityType || PLACE_INFO[selected.category].singular}</p>
            {selected.category === "drinking-fountain" ?
              <p>Water service, potability, seasonal operation and accessible approaches are not verified. Some listed assets are dog bowls. Check local signs and the fixture before relying on this stop.</p> :
              selected.category === "picnic-seating" ?
              <p>Each marker represents an individual table or bench, not a reservable picnic area. Seating, availability, reservations, fees, condition and accessible approaches are not verified.</p> :
              <p>This is a Parks asset record, not a complete public-art directory or a verified artwork title. Current visibility, condition and public access are not verified.</p>}
          </section>}
          {selected.category === "grocery-store" && <p>Source-listed grocery store, not live opening or stock information. Confirm the current location and hours before traveling.</p>}
          {selected.category === "reuse-repair" && <section aria-label="Reuse and repair services">
            <h3>Source-listed services</h3>
            {selected.reuseServices && <p>{selected.reuseServices}</p>}
            {selected.reuseItems && <p><strong>Items:</strong> {selected.reuseItems}</p>}
            <p>This listing may be out of date. Confirm hours, eligibility, appointments, accepted items, and fees before visiting or bringing donations.</p>
          </section>}
          {selected.category === "csa-pickup" && <section aria-label="CSA pickup information">
            <h3>Source-listed pickup</h3>
            {selected.pickupSeason && <p><strong>Season:</strong> {selected.pickupSeason}</p>}
            {selected.pickupProducts && <p><strong>Products:</strong> {selected.pickupProducts}</p>}
            <p>Community-supported agriculture (CSA) pickups may require membership, scheduled collection, and permission to access the site. This is not a public market or a live schedule. Confirm the current pickup location and arrangements with the farm; do not enter private property without permission.</p>
          </section>}
          {selected.category === "bicycle-parking" && <section aria-label="Bicycle rack information">
            <h3>Source-listed rack</h3>
            <p><strong>Capacity:</strong> {selected.bikeSpaces === undefined ? "Unknown" : `${selected.bikeSpaces} spaces`}</p>
            <p><strong>Covered:</strong> {selected.bikeCovered === "yes" ? "Yes" : selected.bikeCovered === "no" ? "No" : "Unknown"}</p>
            <p>Markers and cluster counts represent racks, not spaces. This is not live availability or a guarantee of condition, security, or access. Check the rack and local signs before parking. Trip planning does not reserve parking or select a cycling route.</p>
          </section>}
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
          <Link className="wm-btn wm-btn-primary" to={placePlannerLink(selected, origin, originMode, viewSearch)}>Plan a trip here</Link>
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
        <p role="status">No matching places in this {areaLabel}. Try another search, enable more categories, or change the discovery filters. Coverage is limited to the Portland parks system and mapped Portland places.</p>
      ) : null}
      <p className="transit-places-count" role="status">{sorted.length} {sorted.length === 1 ? "place" : "places"} in {areaLabel}</p>
      <ul ref={results} className="transit-places-list" aria-label={`Places in ${areaLabel}`}>
        {sorted.slice(0, limit).map(place => (
          <li key={place.id}>
            <Link to={placeDetailLink(place.id, viewSearch)} className="transit-place-result" data-place-id={place.id}
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
            {savedPlaces && <Button size="sm" variant="ghost" className="transit-place-save"
              aria-label={`${savedPlaces.saved[place.id] ? "Unsave" : "Save"} ${place.name}`}
              aria-pressed={Boolean(savedPlaces.saved[place.id])} onClick={() => savedPlaces.toggle(place)}>
              <FontAwesome name={savedPlaces.saved[place.id] ? "bookmark" : "bookmark-o"} aria-hidden="true" />
            </Button>}
          </li>
        ))}
      </ul>
      {sorted.length > limit && <Button variant="secondary" onClick={() => setLimit(value => value + 40)}>Show more places ({sorted.length - limit} remaining)</Button>}
      </>}
      <details className="transit-places-notices">
        <summary>Data sources and coverage</summary>
        <p>Snapshots are not live listings. Access, entrances, and opening hours are not verified. Mapped places may be missing or out of date.</p>
        {contextOverlays && CONTEXT_CATEGORIES.map(category => {
          const index = contextOverlays.sources[category].index;
          return index && <p key={category}>
            <strong>{CONTEXT_OVERLAY_INFO[category].label}</strong><br />
            <a href={index.sourceUrl} target="_blank" rel="noreferrer">{index.source}</a>
            {" · "}<a href={index.licenseUrl} target="_blank" rel="noreferrer">{index.license}</a><br />
            Retrieved {new Date(index.retrievedAt).toLocaleDateString()}. {index.count.toLocaleString()} mapped features;
            {" "}only tiles intersecting this map area load at the required zoom. {index.coverage}
          </p>;
        })}
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
        {lineOverlays && LINE_OVERLAY_CATEGORIES.map(category => {
          const snapshot = lineOverlays.sources[category].snapshot;
          return snapshot && <p key={category}>
            <strong>{LINE_OVERLAY_INFO[category].label}</strong><br />
            <a href={snapshot.sourceUrl} target="_blank" rel="noreferrer">{snapshot.source}</a>
            {" · "}<a href={snapshot.licenseUrl} target="_blank" rel="noreferrer">{snapshot.license}</a><br />
            Retrieved {new Date(snapshot.retrievedAt).toLocaleDateString()}. {snapshot.coverage}
          </p>;
        })}
      </details>
    </section>
  );
}
