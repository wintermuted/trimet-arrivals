import { Button } from "@wintermuted/ui-theme/react";
import { Feature, LineString } from "geojson";
import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getArrivals } from "../../../api/trimet/arrivals";
import {
  ArrivalData,
  ArrivalLocation,
} from "../../../api/trimet/interfaces/arrivals";
import StopBookmarkControlContainer from "../../nearbyStops/containers/StopBookmarkControlContainer";
import StopInfo from "./common/StopInfo";
import StopArrivals from "./NearbyStopArrivals";
import { TopNavBar } from "./common/TopNavBar";
import WalkingAccess from "./WalkingAccess";
import { stopBackUrl } from "../util/stopNavigation";

interface Props {
  currentLocation: number[];
  handleStopOpened: (stopLocation: ArrivalLocation) => void | (() => void);
  walkingEnabled?: boolean;
  onWalkingRouteChanged?: (feature: Feature<LineString>) => void | (() => void);
}

export function NearbyStopsDetail({
  currentLocation,
  handleStopOpened,
  walkingEnabled = false,
  onWalkingRouteChanged,
}: Props) {
  const { id } = useParams();
  const { search } = useLocation();
  const backTo = stopBackUrl(search);
  const [state, setState] = useState<{
    id: string;
    data?: ArrivalData;
    error?: boolean;
  }>({ id });
  const [retry, setRetry] = useState(0);
  const [selectedRoutes, setSelectedRoutes] = useState<number[]>([]);

  useEffect(() => {
    setSelectedRoutes([]);
  }, [id]);

  function toggleRoute(route: number) {
    setSelectedRoutes((selected) => selected.includes(route)
      ? selected.filter((item) => item !== route)
      : [...selected, route]);
  }

  useEffect(() => {
    let active = true;
    setState({ id });
    async function fetchData() {
      try {
        const arrivals = await getArrivals(id, 90);
        const stopLocation = arrivals.location?.find(
          (location) => location.id === Number(id)
        );
        if (!stopLocation || !Number.isFinite(stopLocation.lat) ||
            !Number.isFinite(stopLocation.lng) || !Array.isArray(arrivals.arrival)) {
          throw new Error("The requested stop was not reported.");
        }
        if (active) {
          setState({ data: arrivals, id });
        }
      } catch {
        if (active) setState({ error: true, id });
      }
    }

    void fetchData();
    return () => {
      active = false;
    };
  }, [id, retry]);

  useEffect(() => {
    if (state.id !== id || !state.data) return;
    const stop = state.data.location.find((location) => location.id === Number(id));
    if (!stop) return;
    try {
      return handleStopOpened(stop);
    } catch (error) {
      console.error("Could not display the stop on the map.", error);
    }
  }, [id, state, handleStopOpened]);

  function retryStop() {
    setRetry((value) => value + 1);
  }

  if (state.id !== id || !state.data) {
    return (
      <div className="scrollarea">
        <TopNavBar id={`Stop ${id}`} backTo={backTo} truncateTitle />
        {state.id === id && state.error ? (
          <div role="alert">
            <p>Could not load this stop's departures and location.</p>
            <Button onClick={retryStop}>Retry stop</Button>
          </div>
        ) : (
          <p role="status">Loading stop...</p>
        )}
      </div>
    );
  }
  const data = state.data;
  const stopLocation = data.location.find(
    (location) => location.id === Number(id)
  );

  return (
    <div className="scrollarea">
      <TopNavBar id={stopLocation.desc} backTo={backTo} truncateTitle />
      <br />
      <StopInfo
        stopLocation={stopLocation}
        arrivalRoutes={data.arrival.map((arrival) => arrival.route)}
        selectedRoutes={selectedRoutes}
        onToggleRoute={toggleRoute}
      />
      <div className="transit-nearby-stop-plan">
        <Link className="wm-btn wm-btn-primary" to={`/nearby/planner?to=${stopLocation.id}`}>
          Plan a trip to this stop
        </Link>
        <StopBookmarkControlContainer
          locationId={stopLocation.id}
          stopLocation={{ ...stopLocation, locid: stopLocation.id }}
          showLabel
        />
      </div>
      {onWalkingRouteChanged && (
        <WalkingAccess
          currentLocation={currentLocation}
          enabled={walkingEnabled}
          onRouteChanged={onWalkingRouteChanged}
          stop={{
            lat: stopLocation.lat,
            lng: stopLocation.lng,
            locid: stopLocation.id,
          }}
          title="Walk to stop"
        />
      )}
      <br />
      <StopArrivals data={data} selectedRoutes={selectedRoutes} />
    </div>
  );
}
