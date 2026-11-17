import {
  Card,
  CardBody,
  CardHeader,
  CardText
} from "@wintermuted/ui-theme/react";
import { sortBy, uniq } from "lodash";
import React, { useEffect, useState } from "react";
import { getAlertsByLocationId } from "../../../api/trimet/alerts";
import { getArrivals } from "../../../api/trimet/arrivals";
import { Alert, AlertsData } from "../../../api/trimet/interfaces/alertsData";
import { ArrivalData } from "../../../api/trimet/interfaces/arrivals";
import { StopLocation } from "../../../api/trimet/interfaces/types";
import Map, { LatLngCoords } from "../../../component/map/Map";
import { AlertsCard } from "../../lineDetail/component/AlertsCard";
import Loading from "../../loading/Loading";
import StopLocationArrivals from "./StopLocationArrivals";
import StopLocationArrivalsTableNav from "./StopLocationArrivalsTableNav";
import StopLocationHeader from "./StopLocationHeader";
import LocationInfoPane from "./StopLocationInfoPane";

export type OnBookmarkClick = (
  stopLocation: StopLocation,
  stopIsBookmarked: boolean
) => void;

interface Props {
  stopIsBookmarked: boolean;
  onBookmarkClick: OnBookmarkClick;
  locationId: number;
}

interface MapCardParams {
  coordinates: number[];
}

interface StopAlertsState {
  locationId: number;
  alerts: Alert[] | undefined;
  loading: boolean;
  error: boolean;
}

function MapCard({ coordinates }: MapCardParams) {
  return (
    <Card>
      <CardHeader as="h5">Map</CardHeader>
      <CardBody>
        <CardText>
          <Map currentLocation={coordinates} />
        </CardText>
      </CardBody>
    </Card>
  );
}

export default function StopLocationView(props: Props) {
  const { onBookmarkClick, stopIsBookmarked, locationId } = props;
  const [arrivalData, setArrivalData] = useState<ArrivalData>(undefined);
  const [alertsState, setAlertsState] = useState<StopAlertsState>({
    locationId,
    alerts: undefined,
    loading: true,
    error: false
  });
  const [alertRefresh, setAlertRefresh] = useState(0);

  useEffect(() => {
    const locIDs = locationId.toString(10);
    getArrivals(locIDs, 45).then(results => {
      setArrivalData(results);
    });
  }, [locationId]);

  useEffect(() => {
    let active = true;
    setAlertsState(previous => ({
      locationId,
      alerts: previous.locationId === locationId ? previous.alerts : undefined,
      loading: true,
      error: false
    }));
    getAlertsByLocationId(locationId)
      .then((result: AlertsData) => {
        if (!result || !Array.isArray(result.alert)) {
          throw new Error("Invalid stop alerts response");
        }
        if (active) {
          setAlertsState({ locationId, alerts: result.alert, loading: false, error: false });
        }
      })
      .catch(() => {
        if (active) {
          setAlertsState(previous => ({
            locationId,
            alerts: previous.locationId === locationId ? previous.alerts : undefined,
            loading: false,
            error: true
          }));
        }
      });
    return () => {
      active = false;
    };
  }, [locationId, alertRefresh]);
  const currentAlertsState = alertsState.locationId === locationId
    ? alertsState
    : { alerts: undefined, loading: true, error: false };

  if (!arrivalData) {
    return <Loading />;
  }

  const location = arrivalData.location[0];
  const routes = sortBy(
    uniq(arrivalData.arrival.map(arrival => arrival.route))
  );

  const coordinates: LatLngCoords = [location.lng, location.lat];
  return (
    <div className="transit-container">
      {/*<br />*/}
      <div className="transit-columns">
        <StopLocationHeader
          location={location}
          onBookmarkClick={onBookmarkClick}
          stopIsBookmarked={stopIsBookmarked}
        />
      </div>
      <br />
      <div className="transit-columns">
        <div className="transit-column transit-column-3">
          <LocationInfoPane arrivalData={arrivalData} />
          <br />
          <AlertsCard
            alertsData={currentAlertsState.alerts}
            stopId={locationId}
            loading={currentAlertsState.loading}
            error={currentAlertsState.error}
            onRefresh={() => setAlertRefresh(value => value + 1)}
          />
        </div>
        <div className="transit-column transit-column-9">
          <StopLocationArrivalsTableNav
            routes={routes}
            locationId={location.id}
          />
          <br />
          <StopLocationArrivals arrivalData={arrivalData} />
          <br />
          <MapCard coordinates={coordinates} />
        </div>
      </div>
    </div>
  );
}
