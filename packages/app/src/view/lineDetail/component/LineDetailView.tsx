import React, { useEffect, useState } from "react";

import { getAlertsByRouteId } from "../../../api/trimet/alerts";
import { Alert, AlertsData } from "../../../api/trimet/interfaces/alertsData";
import {
  RouteDataResultSet,
  TrimetRoute
} from "../../../api/trimet/interfaces/routes";
import { getRouteById } from "../../../api/trimet/routeConfig";
import RouteListItem from "../../../component/route/RouteListItem";
import { maxLightRail } from "../../../data/trimet/schedules/maxLightRail";
import RouteBookmarkButtonContainer from "../../bookmarks/container/RouteBookmarkButtonContainer";
import Loading from "../../loading/Loading";
import RouteAlerts from "../../nearbyRouteDetail/components/RouteAlerts";
import "./LineDetailView.scss";
import { MapCard } from "./MapCard";
import { ScheduleCard } from "./ScheduleCard";
import { StopsCard } from "./StopsCard";

interface Props {
  route: TrimetRoute;
  id: number;
  loadRouteData: (id: number) => {};
}

interface RouteAlertsState {
  routeId: number;
  alerts: Alert[] | undefined;
  loading: boolean;
  error: boolean;
}

export default function LinesViewComponent(props: Props) {
  const { id } = props;
  const [route, setRouteData] = useState<TrimetRoute>(undefined);
  const [routeAlertsState, setRouteAlertsState] = useState<RouteAlertsState>({
    routeId: id,
    alerts: undefined,
    loading: true,
    error: false
  });
  const [alertRefresh, setAlertRefresh] = useState(0);
  const [routeError, setRouteError] = useState<string>(undefined);

  useEffect(() => {
    let active = true;
    setRouteData(undefined);
    setRouteError(undefined);
    getRouteById(id).then((results: RouteDataResultSet) => {
      if (active) {
        const foundRoute = results && results.route && results.route[0];
        if (foundRoute) {
          setRouteData(foundRoute);
        } else {
          setRouteError("This route is no longer available.");
        }
      }
    }).catch(() => {
      if (active) {
        setRouteError("Unable to load this route. Please try again.");
      }
    });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    setRouteAlertsState(previous => ({
      routeId: id,
      alerts: previous.routeId === id ? previous.alerts : undefined,
      loading: true,
      error: false
    }));
    getAlertsByRouteId(id)
      .then((result: AlertsData) => {
        if (!result || !Array.isArray(result.alert)) {
          throw new Error("Invalid route alerts response");
        }
        if (active) {
          setRouteAlertsState({
            routeId: id,
            alerts: result.alert,
            loading: false,
            error: false
          });
        }
      })
      .catch(() => {
        if (active) {
          setRouteAlertsState(previous => ({
            routeId: id,
            alerts: previous.routeId === id ? previous.alerts : undefined,
            loading: false,
            error: true
          }));
        }
      });
    return () => { active = false; };
  }, [id, alertRefresh]);

  const currentRouteAlerts = routeAlertsState.routeId === id
    ? routeAlertsState
    : { alerts: undefined, loading: true, error: false };

  if (routeError) {
    return <p role="alert">{routeError}</p>;
  }

  if (!route) {
    return <Loading />;
  }

  const routeSchedule = maxLightRail[id];

  return (
    <div className="transit-container">
      <div className="transit-columns">
        <div className="transit-column">
          <RouteListItem route={route} />
          <RouteBookmarkButtonContainer route={route} />
        </div>
      </div>
      <br />
      <div className="transit-columns">
        <div className="transit-column transit-column-3">
          <ScheduleCard routeSchedule={routeSchedule} route={route} />
          <br />
          <MapCard />
          <br />
          <RouteAlerts
            id={id}
            alerts={currentRouteAlerts.alerts}
            loading={currentRouteAlerts.loading}
            error={currentRouteAlerts.error}
            onRetry={() => setAlertRefresh(value => value + 1)}
          />
        </div>
        <div className="transit-column transit-column-9">
          <StopsCard route={route} alertsData={currentRouteAlerts.alerts} />
        </div>
      </div>
    </div>
  );
}
