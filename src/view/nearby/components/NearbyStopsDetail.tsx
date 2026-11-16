import { Button } from "@wintermuted/ui-theme/react";
import { Feature, LineString } from "geojson";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getArrivals } from "../../../api/trimet/arrivals";
import {
  ArrivalData,
  ArrivalLocation,
} from "../../../api/trimet/interfaces/arrivals";
import StopInfo from "./common/StopInfo";
import StopArrivals from "./NearbyStopArrivals";
import { TopNavBar } from "./common/TopNavBar";
import WalkingAccess from "./WalkingAccess";

interface Props {
  currentLocation: number[];
  handleStopOpened: (stopLocation: ArrivalLocation) => void;
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
  const [state, setState] = useState<{
    id: string;
    data?: ArrivalData;
    error?: boolean;
  }>({ id });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ id });
    async function fetchData() {
      try {
        const arrivals = await getArrivals(id, 90);
        const stopLocation = arrivals.location?.find(
          (location) => location.id === Number(id)
        );
        if (!stopLocation || !Array.isArray(arrivals.arrival)) {
          throw new Error("The requested stop was not reported.");
        }
        if (active) {
          handleStopOpened(stopLocation);
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
  }, [id, retry, handleStopOpened]);

  function retryStop() {
    setRetry((value) => value + 1);
  }

  if (state.id !== id || !state.data) {
    return (
      <div className="scrollarea">
        <TopNavBar id={`Stop ${id}`} backTo="/nearby/stops" />
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
      <TopNavBar id={stopLocation.desc} backTo="/nearby/stops" />
      <br />
      <StopInfo stopLocation={stopLocation} />
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
      <StopArrivals data={data} />
    </div>
  );
}
