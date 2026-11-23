import { Button, FieldGroup, Select } from "@wintermuted/ui-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import FontAwesome from "react-fontawesome";
import { getArrivals } from "../../../api/trimet/arrivals";
import { Arrival } from "../../../api/trimet/interfaces/arrivals";
import { RouteDirectionStop, TrimetRoute } from "../../../api/trimet/interfaces/routes";
import { getRouteByIdAndDirection } from "../../../api/trimet/routeConfig";
import { DirectionsSelection } from "../util/mapbox/directionsSelection";
import WalkingAccess from "./WalkingAccess";
import { Feature, LineString } from "geojson";
import { DeparturesCard } from "./common/DeparturesCard";
import { InfoCard } from "./common/InfoCard";
import RouteStopInfo from "./common/RouteStopInfo";
import { StopsOnRoute } from "./common/StopsOnRoute";
import { TopNavBar } from "./common/TopNavBar";
import NearbyRouteInfo from "./NearbyRouteInfo";
import "./NearbyRoutes.scss";

type RouteState =
  | { status: "loading"; key: string }
  | { status: "error"; key: string }
  | { status: "ready"; key: string; directionName: string; stops: RouteDirectionStop[] };

type ArrivalsState =
  | { status: "loading"; key: string }
  | { status: "error"; key: string }
  | { status: "ready"; key: string; arrivals: Arrival[]; refreshing: boolean; refreshError: boolean };

export default function NearbySimpleRouteArrivals({
  onSelectionChanged,
  currentLocation,
  walkingEnabled = false,
  onWalkingRouteChanged,
  onRouteInfoChanged,
  onRouteInfoStopHighlighted
}: {
  onSelectionChanged: (selection: DirectionsSelection, onError: () => void) => void | (() => void);
  currentLocation?: number[];
  walkingEnabled?: boolean;
  onWalkingRouteChanged?: (feature: Feature<LineString>) => void | (() => void);
  onRouteInfoChanged?: (route: TrimetRoute, onError: () => void) => () => void;
  onRouteInfoStopHighlighted?: (stopId?: number) => void;
}) {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const infoButton = useRef<HTMLAnchorElement>(null);
  const stop = searchParams.get("stop");
  const direction = searchParams.get("direction");
  const validRoute = /^\d+$/.test(id || "") && Number(id) > 0 &&
    (direction === "0" || direction === "1");
  const routeInfoValues = searchParams.getAll("route");
  const routeInfoOpen = validRoute && routeInfoValues.length === 1 && routeInfoValues[0] === id;
  const routeKey = `${id}-${direction}`;
  const arrivalsKey = `${routeKey}-${stop}`;
  const [route, setRoute] = useState<RouteState>({ status: "loading", key: routeKey });
  const [arrivals, setArrivals] = useState<ArrivalsState>({ status: "loading", key: arrivalsKey });
  const [routeRetry, setRouteRetry] = useState(0);
  const [arrivalsRetry, setArrivalsRetry] = useState(0);
  const [mapRetry, setMapRetry] = useState(0);
  const [mapError, setMapError] = useState(false);
  const [selection, setSelection] = useState<{ key: string; id: string }>();
  const showWalkingRoute = useCallback((feature: Feature<LineString>) => {
    if (!routeInfoOpen && onWalkingRouteChanged) return onWalkingRouteChanged(feature);
  }, [routeInfoOpen, onWalkingRouteChanged]);

  useEffect(() => {
    if (!validRoute) return;
    let cancelled = false;
    setRoute({ status: "loading", key: routeKey });
    getRouteByIdAndDirection(Number(id), Number(direction)).then(data => {
      const selectedRoute = data?.route?.find(item => item.route === Number(id));
      const selectedDirection = selectedRoute?.dir?.find(item => item.dir === Number(direction));
      if (!selectedDirection?.stop?.length) throw new Error("No stops for this route and direction");
      if (!cancelled) setRoute({
        status: "ready",
        key: routeKey,
        directionName: selectedDirection.desc,
        stops: [...selectedDirection.stop].sort((a, b) => a.seq - b.seq)
      });
    }).catch(() => {
      if (!cancelled) setRoute({ status: "error", key: routeKey });
    });
    return () => { cancelled = true; };
  }, [id, direction, validRoute, routeKey, routeRetry]);

  const readyRoute = route.key === routeKey && route.status === "ready" ? route : null;
  const stopIndex = readyRoute?.stops.findIndex(item => String(item.locid) === stop) ?? -1;
  const origin = readyRoute?.stops[stopIndex];

  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    let pending = false;
    async function load() {
      if (pending) return;
      pending = true;
      setArrivals(previous => previous.key === arrivalsKey && previous.status === "ready"
        ? { ...previous, refreshing: true, refreshError: false }
        : { status: "loading", key: arrivalsKey });
      try {
        const data = await getArrivals(String(origin.locid), 60);
        if (!data || "errorMessage" in data || !Array.isArray(data.location) ||
            (data.arrival != null && !Array.isArray(data.arrival))) {
          throw new Error("Invalid arrivals response");
        }
        if (!cancelled) setArrivals({
          status: "ready",
          key: arrivalsKey,
          arrivals: (data.arrival ?? []).filter(item =>
            item.route === Number(id) && item.dir === Number(direction) && item.locid === origin.locid
          ),
          refreshing: false,
          refreshError: false
        });
      } catch {
        if (!cancelled) setArrivals(previous =>
          previous.key === arrivalsKey && previous.status === "ready"
            ? { ...previous, refreshing: false, refreshError: true }
            : { status: "error", key: arrivalsKey });
      } finally {
        pending = false;
      }
    }
    load();
    const timer = window.setInterval(load, 30000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [origin, id, direction, arrivalsKey, arrivalsRetry]);

  const readyArrivals = arrivals.key === arrivalsKey && arrivals.status === "ready" ? arrivals.arrivals : [];
  const selectedArrival = (selection?.key === arrivalsKey && readyArrivals.find(item => item.id === selection.id))
    || readyArrivals[0];
  useEffect(() => {
    if (arrivals.key === arrivalsKey && arrivals.status === "ready") {
      setSelection(selectedArrival ? { key: arrivalsKey, id: selectedArrival.id } : undefined);
    }
  }, [arrivalsKey, arrivals, selectedArrival?.id]);

  useEffect(() => {
    setMapError(false);
    if (origin && validRoute && !routeInfoOpen) {
      return onSelectionChanged(
        { routeId: Number(id), direction: Number(direction), origin },
        () => setMapError(true)
      );
    }
  }, [origin, id, direction, validRoute, routeInfoOpen, onSelectionChanged, mapRetry]);

  if (!validRoute) {
    return <><TopNavBar id="Route" /><p role="alert">Choose a valid route and direction from Routes.</p></>;
  }
  if (route.key !== routeKey || route.status === "loading") {
    return <><TopNavBar id={id} /><p role="status">Loading route stops...</p></>;
  }
  if (route.status === "error") {
    return <><TopNavBar id={id} /><p role="alert">Could not load route stops.</p><Button onClick={() => setRouteRetry(value => value + 1)}>Try again</Button></>;
  }

  function changeStop(value: string) {
    const next = new URLSearchParams(searchParams);
    next.set("stop", value);
    setSearchParams(next);
  }

  function routeInfoSearch(open: boolean) {
    const next = new URLSearchParams(searchParams);
    if (open) next.set("route", id);
    else next.delete("route");
    const query = next.toString();
    return query ? `?${query}` : "";
  }

  function closeRouteInfo() {
    navigate({ pathname: location.pathname, search: routeInfoSearch(false), hash: location.hash }, { replace: true });
    requestAnimationFrame(() => infoButton.current?.focus());
  }

  const stopLocation = origin && { ...origin, id: origin.locid };
  const stopCounts = new Map<number, number>();
  route.stops.forEach(item => stopCounts.set(item.locid, (stopCounts.get(item.locid) ?? 0) + 1));
  const repeatedStopIds = Array.from(stopCounts).filter(([, count]) => count > 1).map(([locid]) => locid);
  return (
    <>
    {routeInfoOpen && (
      <NearbyRouteInfo
        routeId={Number(id)}
        onClose={closeRouteInfo}
        onMapChanged={onRouteInfoChanged}
        onStopHighlightChanged={onRouteInfoStopHighlighted}
      />
    )}
    <div className="scrollarea transit-route-stop-content" hidden={routeInfoOpen}>
      <TopNavBar
        id={id}
        shortSign={route.directionName.replace(/^To\s+/i, "")}
        truncateTitle
        action={
          <Link
            ref={infoButton}
            className="transit-detail-info"
            to={{ pathname: location.pathname, search: routeInfoSearch(true), hash: location.hash }}
            aria-label={`View Route ${id} details`}
            title={`Route ${id} details`}
          >
            <FontAwesome name="info-circle" aria-hidden="true" />
          </Link>
        }
      />
      {mapError && <div><p role="alert">Could not load the route line.</p><Button onClick={() => setMapRetry(value => value + 1)}>Retry map</Button></div>}
      <br />
      <FieldGroup label="From" htmlFor="route-origin">
        <Select id="route-origin" value={origin ? String(origin.locid) : ""} onChange={event => changeStop(event.target.value)}>
          <option value="" disabled>Choose a stop on this route</option>
          {route.stops.map(item => <option key={`${item.locid}-${item.seq}`} value={item.locid}>{item.desc} ({item.locid})</option>)}
        </Select>
      </FieldGroup>
      {!origin ? <p role="alert">Choose a stop on this route and direction.</p> : (
        <>
          <RouteStopInfo shortSign={route.directionName} stopLocation={stopLocation} routeId={Number(id)} direction={Number(direction)} showFromLabel={false} />
          {onWalkingRouteChanged && (
            <WalkingAccess
              currentLocation={currentLocation}
              stop={origin}
              enabled={walkingEnabled}
              onRouteChanged={showWalkingRoute}
            />
          )}
          <br />
          {arrivals.key !== arrivalsKey || arrivals.status === "loading" ? <div><p role="status">Loading departures...</p><Button onClick={() => setArrivalsRetry(value => value + 1)}>Retry departures</Button></div> :
            arrivals.status === "error" ? <div><p role="alert">Could not load departures for this stop.</p><Button onClick={() => setArrivalsRetry(value => value + 1)}>Try again</Button></div> :
              <>
                {arrivals.refreshError && <div><p role="alert">Could not refresh departures. Showing the last received departures.</p><Button onClick={() => setArrivalsRetry(value => value + 1)}>Try again</Button></div>}
                {arrivals.refreshing && <div><p role="status">Refreshing departures...</p><Button onClick={() => setArrivalsRetry(value => value + 1)}>Retry departures</Button></div>}
                {arrivals.arrivals.length
                  ? <DeparturesCard filteredArrivals={arrivals.arrivals} selectedArrival={selectedArrival} onSelect={arrival => setSelection({ key: arrivalsKey, id: arrival.id })} />
                  : <p role="status">No upcoming departures for this route at this stop.</p>}
              </>}
          <br />
          <StopsOnRoute remainingStopsOnRoute={route.stops.slice(stopIndex + 1)} selectedArrival={selectedArrival} repeatedStopIds={repeatedStopIds} />
          <br />
          <InfoCard id={id} />
        </>
      )}
    </div>
    </>
  );
}
