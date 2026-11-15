import { Button, FieldGroup, Select } from "@wintermuted/ui-theme/react";
import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getRouteByIdAndDirection } from "../../../api/trimet/routeConfig";
import { RouteDirectionStop } from "../../../api/trimet/interfaces/routes";
import { TopNavBar } from "./common/TopNavBar";
import "./NearbyRoutes.scss";

type RouteState =
  | { status: "loading"; key: string }
  | { status: "error"; key: string }
  | {
      status: "ready";
      key: string;
      name: string;
      directionName: string;
      stops: RouteDirectionStop[];
    };

function stopId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export default function NearbyDirections({
  onStopSelected
}: {
  onStopSelected: (stop: RouteDirectionStop) => void | (() => void);
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const routeId = stopId(searchParams.get("route"));
  const direction = stopId(searchParams.get("direction"));
  const from = stopId(searchParams.get("from"));
  const to = stopId(searchParams.get("to"));
  const validRoute = routeId !== null && routeId > 0 &&
    (direction === 0 || direction === 1);
  const key = `${routeId}-${direction}`;
  const [state, setState] = useState<RouteState>({ status: "loading", key });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!validRoute) {
      return;
    }
    let cancelled = false;
    setState({ status: "loading", key });
    getRouteByIdAndDirection(routeId, direction)
      .then(data => {
        const route = data?.route?.find(item => item.route === routeId);
        const routeDirection = route?.dir?.find(item => item.dir === direction);
        if (!routeDirection?.stop?.length) {
          throw new Error("No stops available for this route and direction");
        }
        if (!cancelled) {
          setState({
            status: "ready",
            key,
            name: route.desc,
            directionName: routeDirection.desc,
            stops: [...routeDirection.stop].sort((a, b) => a.seq - b.seq)
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error", key });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [routeId, direction, validRoute, key, retry]);

  const route = state.key === key && state.status === "ready" ? state : null;
  const originIndex = route?.stops.findIndex(stop => stop.locid === from) ?? -1;
  const destinationIndex = route?.stops.findIndex(
    (stop, index) => index > originIndex && stop.locid === to
  ) ?? -1;
  const origin = route?.stops[originIndex];
  const destination = origin && route?.stops[destinationIndex];
  const selectedStop = destination || origin;

  useEffect(() => {
    if (validRoute && selectedStop) {
      return onStopSelected(selectedStop);
    }
  }, [validRoute, selectedStop, onStopSelected]);

  if (!validRoute) {
    return (
      <div className="transit-directions">
        <TopNavBar id="Choose a stop" />
        <p role="alert">Choose a route and direction from Routes to get started.</p>
      </div>
    );
  }

  if (state.key !== key || state.status === "loading") {
    return (
      <div className="transit-directions">
        <TopNavBar id="Choose a stop" />
        <p role="status">Loading route stops...</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="transit-directions">
        <TopNavBar id="Choose a stop" />
        <p role="alert">Could not load stops for this route and direction.</p>
        <Button onClick={() => setRetry(value => value + 1)}>Try again</Button>
      </div>
    );
  }

  const remainingStops = origin ? state.stops.slice(originIndex + 1) : [];
  const backTo = origin
    ? `/nearby/simple-routes/${routeId}?stop=${from}&direction=${direction}`
    : "/nearby/simple-routes";

  function changeStop(name: "from" | "to", value: string) {
    const next = new URLSearchParams(searchParams);
    next.set(name, value);
    if (name === "from") {
      next.delete("to");
    }
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="scrollarea transit-directions">
      <TopNavBar id="Choose a stop" backTo={backTo} />
      <div>
        <h4>{state.name}</h4>
        <p>{state.directionName}</p>
      </div>
      <FieldGroup label="Board at" htmlFor="trip-origin">
        <Select
          id="trip-origin"
          value={origin ? String(from) : ""}
          onChange={event => changeStop("from", event.target.value)}
        >
          <option value="" disabled>Choose a boarding stop</option>
          {state.stops.map(stop => (
            <option key={`${stop.locid}-${stop.seq}`} value={stop.locid}>
              {stop.desc} ({stop.locid})
            </option>
          ))}
        </Select>
      </FieldGroup>
      {!origin && (
        <p role="alert">Select a boarding stop on this route and direction.</p>
      )}
      <FieldGroup
        label="Get off at"
        htmlFor="trip-destination"
        hint="Stops ahead of your boarding stop, in route order."
      >
        <Select
          id="trip-destination"
          value={destination ? String(to) : ""}
          disabled={!remainingStops.length}
          onChange={event => changeStop("to", event.target.value)}
        >
          <option value="" disabled>Choose a destination</option>
          {remainingStops.map(stop => (
            <option key={`${stop.locid}-${stop.seq}`} value={stop.locid}>
              {stop.desc} ({stop.locid})
            </option>
          ))}
        </Select>
      </FieldGroup>
      {origin && !remainingStops.length && (
        <p role="status">This is the last stop in this direction. Choose an earlier boarding stop.</p>
      )}
      {searchParams.has("to") && !destination && remainingStops.length > 0 && (
        <p role="alert">Choose a destination after your boarding stop.</p>
      )}
      {destination && (
        <>
          <p role="status">
            {destinationIndex - originIndex}{" "}
            {destinationIndex - originIndex === 1 ? "stop" : "stops"} to{" "}
            <strong>{destination.desc}</strong>.
          </p>
          <Link
            className="wm-btn wm-btn-primary"
            to={`/nearby/simple-routes/${routeId}?stop=${to}&direction=${direction}`}
          >
            View destination arrivals
          </Link>
        </>
      )}
    </div>
  );
}
