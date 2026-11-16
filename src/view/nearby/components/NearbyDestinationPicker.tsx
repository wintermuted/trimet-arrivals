import { Button } from "@wintermuted/ui-theme/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getAllRoutes } from "../../../api/trimet/routeConfig";
import {
  RouteDirectionStop,
  TrimetRoute,
} from "../../../api/trimet/interfaces/routes";
import useStopHighlight from "../util/useStopHighlight";

export default function NearbyDestinationPicker({
  stops,
  destination,
  routeId,
  onSelect,
  onOpenChange,
  onStopHighlightChanged,
}: {
  stops: RouteDirectionStop[];
  destination?: RouteDirectionStop;
  routeId: number;
  onSelect: (stop: RouteDirectionStop) => void;
  onOpenChange: (open: boolean) => void;
  onStopHighlightChanged?: (stopId?: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [routes, setRoutes] = useState<TrimetRoute[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const picker = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(false);
  const { clearHighlight, focusStop, hoverStop } = useStopHighlight(onStopHighlightChanged);

  useEffect(() => {
    if (open) {
      const sidebar = picker.current?.closest(".scrollarea");
      if (sidebar) {
        sidebar.scrollTop = 0;
      }
      searchInput.current?.focus({ preventScroll: true });
    } else if (wasOpen.current) {
      picker.current?.querySelector<HTMLButtonElement>("#trip-destination")?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => () => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open || routes) {
      return;
    }
    let active = true;
    setLoading(true);
    setError(false);
    getAllRoutes()
      .then((data) => {
        if (
          !data ||
          "errorMessage" in data ||
          !Array.isArray(data.route) ||
          !data.route.some((route) => route.route === routeId) ||
          !data.route.every(
            (route) =>
              Array.isArray(route.dir) &&
              route.dir.every(
                (direction) =>
                  direction.stop === undefined || Array.isArray(direction.stop)
              )
          )
        ) {
          throw new Error("Invalid stop route information");
        }
        if (active) {
          setRoutes(data.route);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setError(true);
        }
      });
    return () => {
      active = false;
    };
  }, [open, routes, retry, routeId]);

  const otherRoutes = useMemo(() => {
    const byStop = new Map<number, TrimetRoute[]>();
    const stopIds = new Set(stops.map((stop) => stop.locid));
    routes
      ?.filter((route) => route.route !== routeId)
      .sort((a, b) => a.routeSortOrder - b.routeSortOrder || a.route - b.route)
      .forEach((route) => {
        const servedStops = new Set(
          route.dir.flatMap((direction) =>
            (direction.stop ?? []).map((stop) => stop.locid)
          )
        );
        servedStops.forEach((id) => {
          if (stopIds.has(id)) {
            byStop.set(id, [...(byStop.get(id) || []), route]);
          }
        });
      });
    return byStop;
  }, [routes, stops, routeId]);

  const query = search.trim().toLowerCase();
  const visibleStops = stops.filter(
    (stop) =>
      `${stop.desc} ${stop.locid}`.toLowerCase().includes(query) ||
      otherRoutes
        .get(stop.locid)
        ?.some((route) =>
          `${route.desc} ${route.route}`.toLowerCase().includes(query)
        )
  );

  function choose(stop: RouteDirectionStop) {
    onSelect(stop);
    close();
  }

  function close() {
    setOpen(false);
    onOpenChange(false);
    clearHighlight();
  }

  return (
    <div ref={picker} className="transit-destination-picker">
      <Button
        id="trip-destination"
        variant="secondary"
        className="transit-destination-trigger"
        aria-controls="trip-destination-options"
        aria-expanded={open}
        disabled={!stops.length}
        onClick={() => {
          if (open) {
            close();
          } else {
            setSearch("");
            setOpen(true);
            onOpenChange(true);
          }
        }}
      >
        {destination
          ? `${destination.desc} (${destination.locid})`
          : "Choose a destination"}
      </Button>
      {open && (
        <section
          id="trip-destination-options"
          aria-label="Choose a destination"
          className="transit-destination-panel"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
            }
          }}
        >
          <div className="transit-destination-panel-header">
            <h4>Choose a destination</h4>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
          <p>
            Stops ahead of your boarding stop, in route order. Select a stop to
            get off at.
          </p>
          <label className="transit-destination-search">
            Search stops or routes
            <input
              type="search"
              className="wm-input"
              ref={searchInput}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                clearHighlight();
              }}
            />
          </label>
          {loading && (
            <p role="status">Loading other routes serving these stops...</p>
          )}
          {error && (
            <div role="alert">
              <p>Could not load other routes. You can still select a stop.</p>
              <Button
                variant="secondary"
                onClick={() => setRetry((value) => value + 1)}
              >
                Retry routes
              </Button>
            </div>
          )}
          <ul className="transit-destination-options">
            {visibleStops.map((stop) => (
              <li key={`${stop.locid}-${stop.seq}`}>
                <button
                  type="button"
                  className="transit-destination-option"
                  data-stop-id={stop.locid}
                  aria-pressed={destination?.locid === stop.locid}
                  onClick={() => choose(stop)}
                  onMouseEnter={() => hoverStop(stop.locid)}
                  onMouseLeave={() => hoverStop()}
                  onFocus={() => focusStop(stop.locid)}
                  onBlur={() => focusStop()}
                >
                  <span className="transit-destination-name">
                    <strong title={stop.desc}>{stop.desc}</strong>
                    <small>
                      Stop {stop.locid}
                      {destination?.locid === stop.locid ? " - Selected" : ""}
                    </small>
                  </span>
                  {routes && (
                    <span className="transit-destination-connections">
                      <small>Other routes: </small>
                      {otherRoutes.get(stop.locid)?.length ? (
                        otherRoutes.get(stop.locid).map((route) => (
                          <span className="wm-badge" key={route.route}>
                            {route.desc}
                          </span>
                        ))
                      ) : (
                        <small>None reported at this stop</small>
                      )}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {!visibleStops.length && (
            <p role="status">
              No stops match. Try another stop name, number, or route.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
