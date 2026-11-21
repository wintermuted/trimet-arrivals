import { Button } from "@wintermuted/ui-theme/react";
import React, { useMemo, useState } from "react";
import { useStopCatalog } from "@trimet-arrivals/trimet-client/react";
import { Link } from "react-router-dom";
import {
  getStopCatalog,
  searchStopCatalog,
} from "../../api/trimet/stopCatalog";
import "./StopCatalogView.scss";

const MAX_VISIBLE_STOPS = 100;

export default function StopCatalogView() {
  const catalogState = useStopCatalog(getStopCatalog);
  const [search, setSearch] = useState("");

  const matchingStops = useMemo(
    () =>
      catalogState.catalog
        ? searchStopCatalog(catalogState.catalog.stops, search)
        : [],
    [catalogState.catalog, search],
  );
  const visibleStops = matchingStops.slice(0, MAX_VISIBLE_STOPS);

  return (
    <section
      className="transit-stop-catalog"
      aria-labelledby="stop-catalog-title"
    >
      <header className="transit-stop-catalog-header">
        <div>
          <h2 id="stop-catalog-title">Stops</h2>
          {catalogState.catalog && (
            <p className="transit-stop-catalog-summary">
              {catalogState.catalog.stops.length.toLocaleString()} unique stops
              across {catalogState.catalog.routeCount.toLocaleString()} routes
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          disabled={catalogState.loading}
          onClick={catalogState.refresh}
        >
          Refresh stops
        </Button>
      </header>

      <label
        className="transit-stop-catalog-search"
        htmlFor="stop-catalog-search"
      >
        Search stops by name or ID
        <input
          id="stop-catalog-search"
          className="wm-input"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          autoComplete="off"
        />
      </label>

      {catalogState.loading && (
        <p className="transit-stop-catalog-state" role="status">
          {catalogState.catalog
            ? "Refreshing the TriMet stop catalog..."
            : "Loading TriMet stops..."}
        </p>
      )}
      {catalogState.error && (
        <div className="transit-stop-catalog-state" role="alert">
          <p>
            Could not load the TriMet stop catalog.
            {catalogState.catalog
              ? " The previously loaded results are still available."
              : " Check your connection and try again."}
          </p>
        </div>
      )}

      {catalogState.catalog && (
        <>
          {(catalogState.catalog.incompleteRouteCount > 0 ||
            catalogState.catalog.incompleteDirectionCount > 0 ||
            catalogState.catalog.invalidStopCount > 0) && (
            <p className="transit-stop-catalog-warning" role="status">
              Partial catalog.
              {catalogState.catalog.incompleteDirectionCount > 0 &&
                ` TriMet omitted stop lists for ${catalogState.catalog.incompleteDirectionCount} route directions`}
              {catalogState.catalog.incompleteRouteCount > 0 &&
                ` Direction data is missing for ${catalogState.catalog.incompleteRouteCount} routes`}
              {catalogState.catalog.incompleteRouteNames.length > 0 &&
                ` (${catalogState.catalog.incompleteRouteNames.join(", ")})`}
              {catalogState.catalog.invalidStopCount > 0 &&
                ` ${catalogState.catalog.invalidStopCount} invalid stop records were skipped`}
              . Search results may be incomplete.
            </p>
          )}

          {catalogState.fetchedAt && (
            <p className="transit-stop-catalog-freshness">
              Received from TriMet{" "}
              <time dateTime={catalogState.fetchedAt.toISOString()}>
                {catalogState.fetchedAt.toLocaleString()}
              </time>
              . The source response does not provide an update timestamp.
            </p>
          )}

          {catalogState.catalog.stops.length === 0 ? (
            <p role="status">
              No stops are available in this TriMet route configuration.
            </p>
          ) : search.trim() ? (
            <>
              <div className="transit-stop-catalog-results-heading">
                <h3>Search results</h3>
                <span aria-live="polite">
                  {matchingStops.length.toLocaleString()} matching stops
                </span>
              </div>
              {matchingStops.length === 0 ? (
                <p role="status">
                  No stops match. Try another name or stop ID.
                </p>
              ) : (
                <>
                  {matchingStops.length > MAX_VISIBLE_STOPS && (
                    <p role="status">
                      Showing the first {MAX_VISIBLE_STOPS} matches. Refine
                      your search to see fewer results.
                    </p>
                  )}
                  <ul className="transit-stop-catalog-results">
                    {visibleStops.map((stop) => (
                      <li key={stop.locid}>
                        <Link to={`/stop/${stop.locid}`}>
                          <span>{stop.desc}</span>
                          <small>Stop {stop.locid}</small>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <p role="status">Enter a stop name or ID to search.</p>
          )}
        </>
      )}

      <details className="transit-stop-catalog-about">
        <summary>About coverage and freshness</summary>
        <p>
          This directory is built from TriMet RouteConfig stop lists for the
          routes and directions returned by the current service configuration.
          It is not a separately verified inventory of every physical stop.
          TriMet does not include a source-update timestamp or freshness
          guarantee in this response; the time above is when this browser
          received it.
        </p>
      </details>
    </section>
  );
}
