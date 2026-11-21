import { Button } from "@wintermuted/ui-theme/react";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { SHORTCUTS } from "../../api/localstorage/bookmarkShortcuts";
import { useBookmarkShortcuts } from "@trimet-arrivals/bookmarks/react";
import { readRecentJourneys } from "../../api/localstorage/recentJourneys";
import { selectBookmarks } from "../../store/selectors/bookmarkSelectors";
import { routeBookmarksSelector } from "../../store/selectors/routeBookmarkSelectors";
import { initializeMap } from "../nearby/util/mapbox/initializeMap";
import AllAlertsCard from "./AllAlertsCard";
import { useHomeAlerts } from "./Home";
import { SystemAlertsCard } from "./SystemAlertsCard";
import StopSearch from "./StopSearch";
import "./SearchHome.scss";

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
  const { shortcuts, error } = useBookmarkShortcuts(stops, routes);
  const quickLinks = SHORTCUTS.flatMap(({ key, kind, label }) => {
    const id = shortcuts[key];
    const bookmark = id === undefined ? undefined : (kind === "stop" ? stops : routes)[id];
    return bookmark ? [{ key, kind, id, label, desc: bookmark.desc }] : [];
  });
  const pinnedStops = new Set(quickLinks.filter(link => link.kind === "stop").map(link => link.id));
  const pinnedRoutes = new Set(quickLinks.filter(link => link.kind === "route").map(link => link.id));
  const stopEntries = Object.entries(stops).filter(([id]) => !pinnedStops.has(Number(id))).slice(0, 3);
  const routeEntries = Object.values(routes).filter(route => !pinnedRoutes.has(route.route)).slice(0, 3);
  return (
    <section
      className="transit-search-section"
      aria-labelledby="homepage-bookmarks"
    >
      <h3 id="homepage-bookmarks">Bookmarks</h3>
      {error && <p role="alert">{error}</p>}
      {quickLinks.length > 0 || stopEntries.length > 0 || routeEntries.length > 0 ? (
        <ul className="transit-search-list">
          {quickLinks.map(({ key, kind, id, label, desc }) => (
            <li key={key}>
              <Link to={kind === "stop" ? `/stop/${id}` : `/lines/${id}`}>
                <strong>{label}:</strong> {desc || (kind === "stop" ? "Stop" : "Transit route")} ({id})
              </Link>
            </li>
          ))}
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
