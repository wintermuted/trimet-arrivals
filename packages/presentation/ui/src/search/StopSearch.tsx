import { Button, FieldGroup } from "@wintermuted/ui-theme/react";
import { searchStopCatalog } from "@overworld/trimet-client";
import type { StopCatalog, StopCatalogStop } from "@overworld/trimet-client";
import React, { useId, useMemo, useState } from "react";
import "./StopSearch.scss";

const MATCH_LIMIT = 6;

export interface StopSearchProps {
  catalog?: StopCatalog;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  renderStopLinks: (stop: StopCatalogStop) => React.ReactNode;
  footer?: React.ReactNode;
  inputId?: string;
}

export default function StopSearch({ catalog, loading, error, onRetry, renderStopLinks, footer, inputId }: StopSearchProps) {
  const generatedId = useId();
  const id = inputId ?? generatedId;
  const titleId = `${id}-title`;
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    if (!catalog) return [];
    const results = searchStopCatalog(catalog.stops, query);
    const exact = results.findIndex(stop => String(stop.locid) === query.trim());
    if (exact > 0) results.unshift(...results.splice(exact, 1));
    return results;
  }, [catalog, query]);
  const hasQuery = Boolean(query.trim());
  const partial = catalog && (catalog.incompleteRouteCount > 0 ||
    catalog.incompleteDirectionCount > 0 || catalog.invalidStopCount > 0);

  return (
    <section className="transit-search-primary" aria-labelledby={titleId}>
      <header>
        <h2 id={titleId}>Find a stop</h2>
        <p>Search TriMet stops to check arrivals or plan a trip.</p>
      </header>
      <FieldGroup label="Stop name or ID" htmlFor={id}>
        <input id={id} className="wm-input" type="search" autoComplete="off" value={query}
          onChange={event => setQuery(event.target.value)} />
      </FieldGroup>
      {!catalog && loading && !error && <p role="status">Loading TriMet stops…</p>}
      {error && <>
        <p role="alert">Could not load TriMet stops. Check your connection and try again.</p>
        <Button type="button" variant="secondary" onClick={onRetry}>Retry loading stops</Button>
      </>}
      {partial && <p role="status">TriMet returned a partial stop list. Some stops may be missing.</p>}
      {catalog && hasQuery && <p role="status">
        {!matches.length ? "No stops match. Try another name or stop ID." :
          matches.length > MATCH_LIMIT ?
            `Showing ${MATCH_LIMIT} of ${matches.length} matches. Refine your search to see fewer results.` :
            `${matches.length} ${matches.length === 1 ? "stop matches" : "stops match"}.`}
      </p>}
      {matches.length > 0 && <ul className="transit-search-list" aria-label="Matching stops">
        {matches.slice(0, MATCH_LIMIT).map(stop => <li className="transit-search-result" key={stop.locid}>
          <div><strong>{stop.desc}</strong><small>Stop {stop.locid}</small></div>
          <div className="transit-search-links">{renderStopLinks(stop)}</div>
        </li>)}
      </ul>}
      {footer && <div className="transit-search-links">{footer}</div>}
    </section>
  );
}
