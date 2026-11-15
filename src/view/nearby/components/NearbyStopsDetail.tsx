import { isEmpty } from "lodash";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getArrivals } from "../../../api/trimet/arrivals";
import {
  ArrivalData,
  ArrivalLocation
} from "../../../api/trimet/interfaces/arrivals";
import { getNormalizedDistanceString } from "../util/turfUtils";
import StopInfo from "./common/StopInfo";
import StopArrivals from "./NearbyStopArrivals";
import { TopNavBar } from "./common/TopNavBar";

interface Props {
  currentLocation: number[];
  handleStopOpened: (stopLocation: ArrivalLocation) => void;
}

export function NearbyStopsDetail({
  currentLocation,
  handleStopOpened
}: Props) {
  const { id } = useParams();
  const [data, setData] = useState<ArrivalData>(null);

  useEffect(() => {
    async function fetchData() {
      const arrivals = await getArrivals(id, 90);
      const stopLocation = arrivals.location[0];
      handleStopOpened(stopLocation);
      setData(arrivals);
    }

    fetchData();
  }, [id]);

  if (isEmpty(data)) {
    return null;
  }

  const stopLocation = data.location[0];
  const stopLocationCoords = [stopLocation.lng, stopLocation.lat];
  const distanceDescription = getNormalizedDistanceString(
    currentLocation,
    stopLocationCoords
  );

  return (
    <div className="scrollarea">
      <TopNavBar id={stopLocation.desc} backTo="/nearby/stops" />
      <br />
      <StopInfo stopLocation={stopLocation} />
      <br />
      <StopArrivals data={data} />
    </div>
  );
}
