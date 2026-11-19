import { Button } from "@wintermuted/ui-theme/react";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import FontAwesome from "react-fontawesome";
import { Link, useLocation } from "react-router-dom";
import { categoryName, PLACE_CATEGORIES, placeDetailLink, searchPlaces, usePlaceCatalog } from "../../../api/places/places";
import PlacesLoadStatus, { placeSourceIssues } from "../../nearby/components/PlacesLoadStatus";
import "./GlobalPlacesSearch.scss";

const PAGE_SIZE = 10;

export default function GlobalPlacesSearch() {
  const [activated, setActivated] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const catalog = usePlaceCatalog(activated);
  const location = useLocation();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const matches = useMemo(() => searchPlaces(catalog.places, query), [catalog.places, query]);
  const issues = placeSourceIssues(catalog.sources, catalog.retry);
  const loading = activated && PLACE_CATEGORIES.some(category => catalog.sources[category].loading ||
    (!catalog.sources[category].snapshot && !catalog.sources[category].error));
  const hasQuery = Boolean(query.trim());

  useEffect(() => setOpen(false), [location]);
  useEffect(() => setLimit(PAGE_SIZE), [query]);
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  function show() {
    setActivated(true);
    setOpen(true);
  }
  function close() {
    input.current?.focus();
    setOpen(false);
  }
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (!open || !["ArrowDown", "ArrowUp"].includes(event.key)) return;
    const links = Array.from(root.current?.querySelectorAll<HTMLAnchorElement>("a[data-global-place]") || []);
    const index = event.target instanceof HTMLAnchorElement ? links.indexOf(event.target) : -1;
    if (event.target !== input.current && index < 0) return;
    const next = event.key === "ArrowDown" ? links[Math.min(index + 1, links.length - 1)] : links[index - 1] || input.current;
    if (next) { event.preventDefault(); next.focus(); }
  }

  return <div ref={root} className="transit-global-place-search" onKeyDownCapture={handleKeyDown}
    onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
    <form role="search" aria-label="All places" onSubmit={event => { event.preventDefault(); show(); }}>
      <label htmlFor={`${id}-input`} className="wm-sr-only">Search all places</label>
      <FontAwesome name="search" className="transit-global-search-icon" aria-hidden="true" />
      <input ref={input} id={`${id}-input`} type="search" className="wm-input" autoComplete="off"
        placeholder="Search all places" value={query} aria-controls={open ? `${id}-results` : undefined}
        aria-describedby={`${id}-hint`} onFocus={show} onClick={show}
        onChange={event => { setQuery(event.target.value); show(); }} />
      <span id={`${id}-hint`} className="wm-sr-only">
        Search every place category across Portland, regardless of map filters. Use Arrow Down or Tab to browse results. Escape closes search.
      </span>
    </form>
    {open && <section id={`${id}-results`} className="transit-global-search-popover" aria-label="Global Places search results">
      <div className="transit-global-search-heading">
        <h2>All places</h2>
        <PlacesLoadStatus label="All places" issues={issues} loading={loading && !issues.length} />
        <Button size="sm" variant="ghost" aria-label="Close Places search" onClick={close}>
          <FontAwesome name="times" aria-hidden="true" />
        </Button>
      </div>
      <p className="transit-global-search-scope">All categories, across Portland. Map filters stay unchanged.</p>
      <p role="status" className="transit-global-search-count">
        {!hasQuery ? "Search by name, category, address or source-listed type." :
          matches.length ? `Showing ${Math.min(limit, matches.length)} of ${matches.length} ${matches.length === 1 ? "place" : "places"}${loading ? " found so far" : ""}.` :
          loading ? "Loading the place catalog..." :
          issues.length ? "No matching places in the loaded categories. Retry unavailable categories above." :
          "No places match. Try another name, category or address."}
      </p>
      {hasQuery && matches.length > 0 && <ul aria-label="Matching places" className="transit-global-search-results">
        {matches.slice(0, limit).map(place => <li key={place.id}>
          <Link to={placeDetailLink(place.id)} data-global-place={place.id} onClick={() => setOpen(false)}>
            <strong>{place.name}</strong>
            <small>{categoryName(place.category)}{place.address ? ` / ${place.address}` : ""}</small>
          </Link>
        </li>)}
      </ul>}
      {hasQuery && matches.length > limit && <Button className="transit-global-search-more" size="sm" variant="secondary"
        onClick={() => setLimit(previous => previous + PAGE_SIZE)}>Show more places ({matches.length - limit} remaining)</Button>}
    </section>}
  </div>;
}
