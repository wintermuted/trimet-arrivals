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
}

function StopInfo({ stopLocation }: StopInfoParams) {
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

  return (
    <Card>
      <CardBody>
        <CardText>
          <small style={{ color: "var(--wm-color-text-muted)" }}>
            StopID: {stopLocation.id}
          </small>
        </CardText>
        <div className="transit-destination-connections">
          <span>Routes serving this stop: </span>
          {error ? (
            <span role="alert">
              Routes could not be loaded.{" "}
              <Button variant="link" onClick={() => setRetry((value) => value + 1)}>Retry routes</Button>
            </span>
          ) : !routes ? (
            <span role="status">Loading routes...</span>
          ) : routes.length ? (
            routes.map((route) => (
              <span className="wm-badge" key={route.route} title={route.desc}
                aria-label={`Route ${route.route}: ${route.desc}`}>
                {route.route}
              </span>
            ))
          ) : <span>No routes reported.</span>}
        </div>
      </CardBody>
    </Card>
  );
}

export default StopInfo;
