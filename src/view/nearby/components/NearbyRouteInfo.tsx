import { Button } from "@wintermuted/ui-theme/react";
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import FontAwesome from "react-fontawesome";
import { getRouteById } from "../../../api/trimet/routeConfig";
import { TrimetRoute } from "../../../api/trimet/interfaces/routes";
import useStopHighlight from "../util/useStopHighlight";

export default function NearbyRouteInfo({
  routeId,
  routeName,
  onClose,
  onMapChanged,
  onStopHighlightChanged,
}: {
  routeId: number;
  routeName: string;
  onClose: () => void;
  onMapChanged?: (route: TrimetRoute, onError: () => void) => () => void;
  onStopHighlightChanged?: (stopId?: number) => void;
}) {
  const [route, setRoute] = useState<TrimetRoute>();
  const [error, setError] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [mapRetry, setMapRetry] = useState(0);
  const closeButton = useRef<HTMLButtonElement>(null);
  const { clearHighlight, focusStop, hoverStop } = useStopHighlight(onStopHighlightChanged);

  useEffect(() => {
    const sidebar = closeButton.current?.closest(".transit-nearby-results");
    if (sidebar) sidebar.scrollTop = 0;
    closeButton.current?.focus({ preventScroll: true });
    let active = true;
    setError(false);
    setRoute(undefined);
    getRouteById(routeId).then((data) => {
      const found = data?.route?.find((item) => item.route === routeId);
      if (!found || !Array.isArray(found.dir) || !found.dir.length ||
          !found.dir.every((direction) => Array.isArray(direction.stop))) {
        throw new Error("Invalid route details");
      }
      if (active) setRoute(found);
    }).catch(() => {
      if (active) setError(true);
    });
    return () => { active = false; };
  }, [routeId, retry]);

  useEffect(() => {
    if (!route || !onMapChanged) return;
    setMapError(false);
    return onMapChanged(route, () => setMapError(true));
  }, [route, onMapChanged, mapRetry]);

  return (
    <section
      className="transit-destination-panel transit-route-info"
      aria-label={`Route ${routeId} details`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="transit-destination-panel-header">
        <h4>Route {routeId}: {routeName}</h4>
        <Button ref={closeButton} variant="ghost" onClick={onClose}>Close</Button>
      </div>
      {error ? (
        <div role="alert">
          <p>Route details could not be loaded.</p>
          <Button variant="secondary" onClick={() => setRetry((value) => value + 1)}>Retry</Button>
        </div>
      ) : !route ? (
        <p role="status">Loading route details...</p>
      ) : (
        <>
          <Link to={`/lines/${routeId}`}>View full route details, schedules and alerts</Link>
          {mapError && (
            <div role="alert">
              <p>Some route lines could not be loaded. Stop locations are still shown.</p>
              <Button variant="secondary" onClick={() => {
                clearHighlight();
                setMapRetry((value) => value + 1);
              }}>Retry map</Button>
            </div>
          )}
          {route.dir.map((direction) => (
            <details
              key={direction.dir}
              className="transit-simple-route-direction"
              open
              onToggle={(event) => {
                if (!event.currentTarget.open) clearHighlight();
              }}
            >
              <summary><FontAwesome name="caret-right" aria-hidden="true" />{direction.desc}</summary>
              <ol className="transit-route-info-stops">
                {direction.stop.map((stop) => (
                  <li
                    key={`${stop.locid}-${stop.seq}`}
                    tabIndex={0}
                    data-stop-id={stop.locid}
                    onMouseEnter={() => hoverStop(stop.locid)}
                    onMouseLeave={() => hoverStop()}
                    onFocus={() => focusStop(stop.locid)}
                    onBlur={() => focusStop()}
                  >
                    <span>{stop.desc}</span><small>{stop.locid}</small>
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </>
      )}
    </section>
  );
}
