import { Button, FieldGroup } from "@wintermuted/ui-theme/react";
import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getRouteByIdAndDirection } from "../../../api/trimet/routeConfig";
import { RouteDirectionStop } from "../../../api/trimet/interfaces/routes";
import { TopNavBar } from "./common/TopNavBar";
import { DirectionsSelection } from "../util/mapbox/directionsSelection";
import NearbyTripTimes from "./NearbyTripTimes";
import NearbyDestinationPicker from "./NearbyDestinationPicker";
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
  onSelectionChanged,
  onStopHighlightChanged,
  showTripTimes = false,
  showTrip = false
}: {
  showTripTimes?: boolean;
  showTrip?: boolean;
  onStopHighlightChanged?: (stopId?: number) => void;
  onSelectionChanged: (
    selection: DirectionsSelection,
    onError: () => void
  ) => void | (() => void);
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
  const [mapError, setMapError] = useState(false);
  const [mapRetry, setMapRetry] = useState(0);
  const [choosingDestination, setChoosingDestination] = useState(false);
  const changeDestination = useCallback((stop: RouteDirectionStop) => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.set("to", String(stop.locid));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

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
  useEffect(() => {
    setMapError(false);
    if (validRoute && origin) {
      return onSelectionChanged(
        {
          routeId, direction, origin, destination,
          ...(!showTripTimes && !showTrip ? {
            destinationStops: route.stops.slice(originIndex + 1),
            onChooseDestination: changeDestination
          } : {})
        },
        () => setMapError(true)
      );
    }
  }, [routeId, direction, validRoute, origin, originIndex, destination, onSelectionChanged, mapRetry, route, showTripTimes, showTrip, changeDestination]);

  if (!validRoute) {
    return (
      <div className="transit-directions">
        <TopNavBar id="Choose a destination" />
        <p role="alert">Choose a route and direction from Routes to get started.</p>
      </div>
    );
  }

  if (state.key !== key || state.status === "loading") {
    return (
      <div className="transit-directions">
        <TopNavBar id="Choose a destination" />
        <p role="status">Loading route stops...</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="transit-directions">
        <TopNavBar id="Choose a destination" />
        <p role="alert">Could not load stops for this route and direction.</p>
        <Button onClick={() => setRetry(value => value + 1)}>Try again</Button>
      </div>
    );
  }

  const remainingStops = origin ? state.stops.slice(originIndex + 1) : [];
  const backTo = origin
    ? `/nearby/simple-routes/${routeId}?stop=${from}&direction=${direction}`
    : "/nearby/simple-routes";
  const selectionQuery = new URLSearchParams({
    route: String(routeId), direction: String(direction), from: String(from), to: String(to)
  }).toString();
  const selectionUrl = `/nearby/directions?${selectionQuery}`;

  if (showTripTimes || showTrip) {
    if (!origin || !destination) {
      return (
        <div className="transit-directions">
          <TopNavBar id="Trip times" backTo={selectionUrl} />
          <p role="alert">Choose a boarding stop and a downstream destination to view trip times.</p>
          <Link className="wm-btn wm-btn-primary" to={selectionUrl}>Choose stops</Link>
        </div>
      );
    }
    const tripBackTo = showTrip && searchParams.get("source") === "arrivals"
      ? `/nearby/directions/arrivals?${selectionQuery}` : selectionUrl;
    const departureId = searchParams.get("departure");
    if (showTrip && !departureId) {
      return (
        <div className="transit-directions">
          <TopNavBar id="Trip details" backTo={tripBackTo} />
          <p role="alert">Choose a departure to view its trip.</p>
          <Link className="wm-btn wm-btn-primary" to={tripBackTo}>Choose a trip</Link>
        </div>
      );
    }
    return (
      <>
        {mapError && (
          <div>
            <p role="alert">Could not load the route line. Trip times are still available.</p>
            <Button variant="secondary" onClick={() => setMapRetry(value => value + 1)}>
              Retry map
            </Button>
          </div>
        )}
        <NearbyTripTimes
          routeId={routeId}
          direction={direction}
          origin={origin}
          destination={destination}
          routeName={state.name}
          directionName={state.directionName}
          backTo={tripBackTo}
          selectedTrip={showTrip && departureId ? {
            departureId, tripId: searchParams.get("trip") || undefined
          } : undefined}
        />
      </>
    );
  }

  return (
    <div className={`scrollarea transit-directions${choosingDestination ? " transit-directions-picking" : ""}`}>
      <TopNavBar
        id={state.name}
        subtitle={destination ? `To ${destination.desc}` : state.directionName}
        backTo={backTo}
        truncateTitle
      />
      {mapError && (
        <div className="transit-directions-map-error">
          <p role="alert">Could not load the route line. Your stop selections are still available.</p>
          <Button variant="secondary" onClick={() => setMapRetry(value => value + 1)}>
            Retry map
          </Button>
        </div>
      )}
      <div className="transit-boarding-stop">
        {origin ? (
          <dl className="transit-trip-stops">
            <div><dt>Board at</dt><dd>{origin.desc} ({from})</dd></div>
          </dl>
        ) : (
          <p role="alert">Go back to select a boarding stop on this route and direction.</p>
        )}
        <Link to={backTo}>Go back to change boarding stop</Link>
      </div>
      <FieldGroup
        className="transit-destination-field"
        label="Get off at"
        htmlFor="trip-destination"
        hint="Stops ahead of your boarding stop, in route order."
      >
        <NearbyDestinationPicker
          stops={remainingStops}
          destination={destination}
          routeId={routeId}
          onOpenChange={setChoosingDestination}
          onStopHighlightChanged={onStopHighlightChanged}
          onSelect={changeDestination}
        />
      </FieldGroup>
      {origin && !remainingStops.length && (
        <p role="status">This is the last stop in this direction. Go back to choose an earlier boarding stop.</p>
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
          <NearbyTripTimes
            inline
            routeId={routeId}
            direction={direction}
            origin={origin}
            destination={destination}
            routeName={state.name}
            directionName={state.directionName}
            backTo={selectionUrl}
          />
          <Link
            className="wm-btn wm-btn-primary"
            to={`/nearby/directions/arrivals?${selectionQuery}`}
          >
            View destination arrivals
          </Link>
        </>
      )}
    </div>
  );
}
