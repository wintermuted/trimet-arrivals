import React, { useEffect, useState } from "react";
import { Button } from "@wintermuted/ui-theme/react";
import { Link, useHref } from "react-router-dom";
import { currentPlacePreset, PLACE_PRESETS, PlacePreset, PlacesView, TripCorridor } from "@overworld/places/discovery";
import { SavedPlaceControls } from "@overworld/places/savedPlaces";

export default function NearbyDiscoveryControls({ view, onPreset, shareHref, viewError,
  savedPlaces, savedOnly, onSavedOnly, unavailable, trip, alongTrip, onAlongTrip, distance, onDistance }: {
  view: PlacesView;
  onPreset: (preset: PlacePreset) => void;
  shareHref: string;
  viewError?: string;
  savedPlaces: SavedPlaceControls;
  savedOnly: boolean;
  onSavedOnly: (value: boolean) => void;
  unavailable: [string, string][];
  trip?: TripCorridor;
  alongTrip: boolean;
  onAlongTrip: (value: boolean) => void;
  distance: number;
  onDistance: (value: number) => void;
}) {
  const [share, setShare] = useState<{ href: string; copied: boolean }>();
  const resolvedHref = useHref(shareHref);
  useEffect(() => setShare(undefined), [resolvedHref]);
  async function copy() {
    const href = new URL(resolvedHref, window.location.href).href;
    try {
      await navigator.clipboard.writeText(href);
      setShare({ href, copied: true });
    } catch {
      setShare({ href, copied: false });
    }
  }
  return <section className="transit-places-discovery" aria-label="Discovery tools">
    {viewError && <p role="alert">{viewError}</p>}
    <label className="transit-places-preset">Discovery preset
      <select className="wm-input" value={currentPlacePreset(view)} onChange={event => onPreset(event.target.value as PlacePreset)}>
        <option value="custom" disabled>Custom filters</option>
        <option value="default">Default places</option>
        {PLACE_PRESETS.map(preset => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
      </select>
    </label>
    <div className="transit-places-discovery-actions">
      <Button size="sm" variant="secondary" onClick={() => void copy()}>Copy view link</Button>
      <Button size="sm" variant="ghost" onClick={() => onPreset("default")}>Reset filters</Button>
    </div>
    {share && <div>
      <p role="status">{share.copied ? "View link copied." : "The link could not be copied. Select and copy it below."}</p>
      {!share.copied && <label>View link<input className="wm-input" readOnly value={share.href} onFocus={event => event.target.select()} /></label>}
      <p>Links include categories, layers, search and map position, not saved places or your current trip.</p>
    </div>}
    <label className="transit-places-category">
      <input type="checkbox" checked={savedOnly} onChange={event => onSavedOnly(event.target.checked)} />
      Saved places only ({Object.keys(savedPlaces.saved).length})
    </label>
    {savedOnly && <p>Saved on this device. Shows matching saved places across Portland, not just this map area. Category and search filters still apply.</p>}
    {savedOnly && unavailable.length > 0 && <section aria-label="Unavailable saved places">
      <p>These saved places are no longer in the current catalog:</p>
      <ul>{unavailable.map(([id, name]) => <li key={id}>{name}{" "}
        <Button size="sm" variant="ghost" onClick={() => savedPlaces.remove(id)}>Remove {name}</Button>
      </li>)}</ul>
    </section>}
    {trip ? <div className="transit-places-trip-filter">
      <label className="transit-places-category">
        <input type="checkbox" checked={alongTrip} onChange={event => onAlongTrip(event.target.checked)} />
        Places along my trip
      </label>
      {alongTrip && <label>Distance from mapped trip
        <select className="wm-input" value={distance} onChange={event => onDistance(Number(event.target.value))}>
          <option value={250}>250 m</option><option value={500}>500 m</option><option value={1000}>1 km</option>
        </select>
      </label>}
      <p>Approximate straight-line distance, not walking distance, access or a reachable detour.
        {trip.incomplete && " Some trip legs have no mapped geometry and are excluded."} Category and search filters still apply.</p>
      <Link to={trip.returnTo}>Return to trip planner</Link>
    </div> : <p><Link to="/nearby/planner">Find places along a trip</Link></p>}
  </section>;
}
