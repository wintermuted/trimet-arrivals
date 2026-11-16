import { Button } from "@wintermuted/ui-theme/react";
import { Feature, LineString } from "geojson";
import React, { useEffect, useState } from "react";
import {
  getWalkingRoute,
  WalkingRoute,
  WalkingStop,
} from "../../../api/mapbox/walking";
import { getNormalizedDistanceString } from "../util/turfUtils";
import { WalkingDistance } from "./common/WalkingDistance";

interface Props {
  currentLocation: number[];
  stop: WalkingStop;
  enabled: boolean;
  onRouteChanged: (feature: Feature<LineString>) => void | (() => void);
}

type State =
  | { key: string; status: "loading" }
  | { key: string; status: "error"; message: string }
  | { key: string; status: "ready"; route: WalkingRoute };

export default function WalkingAccess({
  currentLocation,
  stop,
  enabled,
  onRouteChanged,
}: Props) {
  const lng = currentLocation?.[0];
  const lat = currentLocation?.[1];
  const key = JSON.stringify([lng, lat, stop.locid, stop.lng, stop.lat]);
  const [state, setState] = useState<State>({ key, status: "loading" });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setState({ key, status: "loading" });
      return;
    }
    const request = new AbortController();
    setState({ key, status: "loading" });
    getWalkingRoute([lng, lat], stop, request.signal)
      .then((route) => {
        if (!request.signal.aborted) setState({ key, route, status: "ready" });
      })
      .catch((error) => {
        if (!request.signal.aborted)
          setState({
            key,
            message:
              error instanceof Error
                ? error.message
                : "Could not load the walking route.",
            status: "error",
          });
      });
    return () => request.abort();
  }, [enabled, lng, lat, stop.locid, stop.lng, stop.lat, key, retry]);

  const route =
    enabled && state.key === key && state.status === "ready"
      ? state.route
      : undefined;
  useEffect(() => {
    if (route?.status === "ready") return onRouteChanged(route.feature);
  }, [route, onRouteChanged]);

  const straightLine = [lng, lat, stop.lng, stop.lat].every(Number.isFinite)
    ? getNormalizedDistanceString([lng, lat], [stop.lng, stop.lat])
    : "Distance unavailable";
  function refreshWalkingRoute() {
    setRetry((value) => value + 1);
  }
  if (!enabled) return null;
  return (
    <section
      className="transit-walking-access"
      aria-label="Walk to boarding stop"
    >
      <h4>Walk to boarding stop</h4>
      <WalkingDistance
        enabled
        estimate={route}
        loading={state.key !== key || state.status === "loading"}
        straightLine={straightLine}
      />
      {state.key === key && state.status === "error" && (
        <p role="alert">Could not load walking directions. {state.message}</p>
      )}
      {route?.status === "uncertain" && (
        <p role="status">
          Mapbox could not match this location reliably to nearby walking paths.
        </p>
      )}
      {route?.status === "ready" && (
        <p>The dashed green line shows the estimated walking path.</p>
      )}
      <Button variant="link" onClick={refreshWalkingRoute}>
        {state.status === "error"
          ? "Retry walking directions"
          : "Refresh walking directions"}
      </Button>
    </section>
  );
}
