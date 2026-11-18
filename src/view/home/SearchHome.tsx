import { Button, FieldGroup } from "@wintermuted/ui-theme/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { readRecentJourneys } from "../../api/localstorage/recentJourneys";
import {
  getStopCatalog,
  searchStopCatalog,
  StopCatalog,
} from "../../api/trimet/stopCatalog";
import { selectBookmarks } from "../../store/selectors/bookmarkSelectors";
import { routeBookmarksSelector } from "../../store/selectors/routeBookmarkSelectors";
import { initializeMap } from "../nearby/util/mapbox/initializeMap";
import AllAlertsCard from "./AllAlertsCard";
import { useHomeAlerts } from "./Home";
import { SystemAlertsCard } from "./SystemAlertsCard";
import "./SearchHome.scss";

const MATCH_LIMIT = 6;

function StopSearch() {
  const [query, setQuery] = useState("");
  const [retry, setRetry] = useState(0);
  const [catalog, setCatalog] = useState<StopCatalog>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getStopCatalog(retry > 0).then(
      (result) => {
        if (active) setCatalog(result);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [retry]);

  const matches = useMemo(() => {
    if (!catalog) return [];
    const results = searchStopCatalog(catalog.stops, query);
    const exact = results.findIndex(
      (stop) => String(stop.locid) === query.trim(),
    );
    if (exact > 0) results.unshift(...results.splice(exact, 1));
    return results;
  }, [catalog, query]);
  const hasQuery = Boolean(query.trim());
  const partial =
    catalog &&
    (catalog.incompleteRouteCount > 0 ||
      catalog.incompleteDirectionCount > 0 ||
      catalog.invalidStopCount > 0);

  return (
    <section
      className="transit-search-primary"
      aria-labelledby="transit-search-title"
    >
      <header>
        <h2 id="transit-search-title">Find a stop</h2>
        <p>Search TriMet stops to check arrivals or plan a trip.</p>
      </header>
      <FieldGroup label="Stop name or ID" htmlFor="homepage-stop">
        <input
          id="homepage-stop"
          className="wm-input"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </FieldGroup>
      {!catalog && !failed && <p role="status">Loading TriMet stops…</p>}
      {failed && (
        <>
          <p role="alert">
            Could not load TriMet stops. Check your connection and try again.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setFailed(false);
              setRetry((value) => value + 1);
            }}
          >
            Retry loading stops
          </Button>
        </>
      )}
      {partial && (
        <p role="status">
          TriMet returned a partial stop list. Some stops may be missing.
        </p>
      )}
      {catalog && hasQuery && (
        <p role="status">
          {!matches.length
            ? "No stops match. Try another name or stop ID."
            : matches.length > MATCH_LIMIT
              ? `Showing ${MATCH_LIMIT} of ${matches.length} matches. Refine your search to see fewer results.`
              : `${matches.length} ${matches.length === 1 ? "stop matches" : "stops match"}.`}
        </p>
      )}
      {matches.length > 0 && (
        <ul className="transit-search-list" aria-label="Matching stops">
          {matches.slice(0, MATCH_LIMIT).map((stop) => (
            <li className="transit-search-result" key={stop.locid}>
              <div>
                <strong>{stop.desc}</strong>
                <small>Stop {stop.locid}</small>
              </div>
              <div className="transit-search-links">
                <Link
                  to={`/planner?to=${stop.locid}`}
                  aria-label={`Plan a trip to ${stop.desc}, stop ${stop.locid}`}
                >
                  Plan a trip
                </Link>
                <Link
                  to={`/stop/${stop.locid}`}
                  aria-label={`Arrivals at ${stop.desc}, stop ${stop.locid}`}
                >
                  Arrivals
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="transit-search-links">
        <Link to="/planner">Plan a trip</Link>
        <Link to="/stops">Browse all stops</Link>
        <a href="#homepage-alerts">Service alerts</a>
      </div>
    </section>
  );
}

function RecentJourneys() {
  const [history] = useState(() => {
    try {
      return { journeys: readRecentJourneys(), error: false };
    } catch {
      return { journeys: [], error: true };
    }
  });
  return (
    <section
      className="transit-search-section"
      aria-labelledby="homepage-recent"
    >
      <h3 id="homepage-recent">Recent journeys</h3>
      {history.error ? (
        <p>Recent journeys are unavailable on this device.</p>
      ) : history.journeys.length === 0 ? (
        <p>Trips you find in the planner appear here.</p>
      ) : (
        <ul className="transit-search-list">
          {history.journeys.map(({ from, to }) => (
            <li key={`${from.locid}-${to.locid}`}>
              <Link to={`/planner?from=${from.locid}&to=${to.locid}`}>
                {from.desc} ({from.locid}) to {to.desc} ({to.locid})
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BookmarkPreview() {
  const stops = useSelector(selectBookmarks);
  const routes = useSelector(routeBookmarksSelector);
  const stopEntries = Object.entries(stops).slice(0, 3);
  const routeEntries = Object.values(routes).slice(0, 3);
  return (
    <section
      className="transit-search-section"
      aria-labelledby="homepage-bookmarks"
    >
      <h3 id="homepage-bookmarks">Bookmarks</h3>
      {stopEntries.length > 0 || routeEntries.length > 0 ? (
        <ul className="transit-search-list">
          {stopEntries.map(([id, stop]) => (
            <li key={`stop-${id}`}>
              <Link to={`/stop/${id}`}>
                {stop.desc || "Stop"} ({id})
              </Link>
            </li>
          ))}
          {routeEntries.map((route) => (
            <li key={`route-${route.route}`}>
              <Link to={`/lines/${route.route}`}>
                Route {route.route}: {route.desc || "Transit route"}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No bookmarks yet. Save a stop or route to see it here.</p>
      )}
      <Link to="/bookmarks">Manage bookmarks</Link>
    </section>
  );
}

function MapPreview() {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    try {
      const map = initializeMap(-122.6784, 45.5152, container, 10, false);
      map.once("load", () => setStatus("ready"));
      map.on("error", () =>
        setStatus((previous) => (previous === "ready" ? previous : "error")),
      );
      return () => {
        map.remove();
      };
    } catch {
      setStatus("error");
    }
  }, []);

  return (
    <>
      {status === "loading" && <p role="status">Loading the map preview…</p>}
      {status === "error" && (
        <p role="status">
          The map preview is unavailable. You can still search stops or open
          Nearby.
        </p>
      )}
      <div
        ref={container}
        className="transit-search-map"
        role="region"
        aria-label="Portland area map preview"
      />
    </>
  );
}

function NearbyPreview() {
  const [showMap, setShowMap] = useState(false);
  return (
    <section
      className="transit-search-section"
      aria-labelledby="homepage-nearby"
    >
      <h3 id="homepage-nearby">Nearby</h3>
      <p>
        Search stops without sharing your location. In Nearby, use your location
        or pick an area on the map.
      </p>
      <div className="transit-search-links">
        <Link to="/nearby">Nearby routes</Link>
        <Link to="/nearby/stops">Nearby stops</Link>
        <Button
          type="button"
          variant="secondary"
          aria-expanded={showMap}
          onClick={() => setShowMap((open) => !open)}
        >
          {showMap ? "Hide map preview" : "Preview Portland map"}
        </Button>
      </div>
      {showMap && <MapPreview />}
    </section>
  );
}

export default function SearchHome() {
  const { alerts, systemAlerts, ...alertState } = useHomeAlerts();
  return (
    <div className="transit-search-home">
      <div className="transit-search-columns">
        <StopSearch />
        <div className="transit-search-support">
          <NearbyPreview />
          <RecentJourneys />
          <BookmarkPreview />
        </div>
      </div>
      <section
        id="homepage-alerts"
        className="transit-search-section"
        aria-labelledby="homepage-alerts-title"
        tabIndex={-1}
      >
        <h3 id="homepage-alerts-title">Service alerts</h3>
        <div className="transit-search-alerts">
          <SystemAlertsCard systemAlertsData={systemAlerts} {...alertState} />
          <AllAlertsCard alertsData={alerts} {...alertState} />
        </div>
      </section>
    </div>
  );
}
