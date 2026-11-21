import {
  Card,
  CardBody,
  CardText,
  Button
} from "@wintermuted/ui-theme/react";
import React, { useEffect, useState } from "react";
import { getNearbyStops } from "../../../../api/trimet/stops";
import { StopLocation, TrimetRoute } from "../../../../api/trimet/interfaces/types";

interface StopInfoParams {
  stopLocation: StopLocation;
  arrivalRoutes: number[];
  selectedRoutes: number[];
  onToggleRoute: (route: number) => void;
}

function StopInfo({ stopLocation, arrivalRoutes, selectedRoutes, onToggleRoute }: StopInfoParams) {
  const [routes, setRoutes] = useState<TrimetRoute[]>();
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const { id, lat, lng } = stopLocation;

  useEffect(() => {
    let active = true;
    setRoutes(undefined);
    setError(false);
    getNearbyStops({ coords: { latitude: lat, longitude: lng } }, 100)
      .then((data) => {
        const stop = data?.location?.find((location) => location.locid === id);
        if (!stop || !Array.isArray(stop.route)) throw new Error("Stop routes unavailable");
        if (active) setRoutes(stop.route);
      })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [id, lat, lng, retry]);

  const routeNames = new Map<number, string>((routes || []).map((route) => [route.route, route.desc]));
  const routeNumbers = Array.from(new Set([
    ...Array.from(routeNames.keys()), ...arrivalRoutes, ...selectedRoutes
  ])).sort((a, b) => a - b);

  return (
    <Card>
      <CardBody>
        <CardText>
          <small style={{ color: "var(--wm-color-text-muted)" }}>
            StopID: {stopLocation.id}
          </small>
        </CardText>
        <div className="transit-destination-connections" role="group" aria-label="Filter departures by route">
          {error ? (
            <span role="alert">
              Routes could not be loaded.{" "}
              <Button variant="link" onClick={() => setRetry((value) => value + 1)}>Retry routes</Button>
            </span>
          ) : !routes ? (
            <span role="status">Loading routes...</span>
          ) : null}
          {routeNumbers.map((route) => {
            const name = routeNames.get(route);
            return (
              <button
                type="button"
                className="wm-badge transit-stop-route-filter"
                key={route}
                title={name || `Route ${route}`}
                aria-label={name ? `Route ${route}: ${name}` : `Route ${route}`}
                aria-pressed={selectedRoutes.includes(route)}
                aria-controls="stop-departures"
                onClick={() => onToggleRoute(route)}
              >
                {route}
              </button>
            );
          })}
          {routes && !routeNumbers.length && <span>No routes reported.</span>}
        </div>
      </CardBody>
    </Card>
  );
}

export default StopInfo;
