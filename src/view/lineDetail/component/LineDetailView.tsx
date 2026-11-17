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
import { AlertsCard } from "./AlertsCard";
import "./LineDetailView.scss";
import { MapCard } from "./MapCard";
import { ScheduleCard } from "./ScheduleCard";
import { StopsCard } from "./StopsCard";

interface Props {
  route: TrimetRoute;
  id: number;
  loadRouteData: (id: number) => {};
}

export default function LinesViewComponent(props: Props) {
  const { id } = props;
  const [route, setRouteData] = useState<TrimetRoute>(undefined);
  const [alertsData, setAlertsData] = useState<Alert[]>(undefined);
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

    getAlertsByRouteId(id).then((result: AlertsData) => {
      if (active) {
        setAlertsData(result.alert);
      }
    });
    return () => { active = false; };
  }, [id]);

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
          <AlertsCard alertsData={alertsData} />
        </div>
        <div className="transit-column transit-column-9">
          <StopsCard route={route} alertsData={alertsData} />
        </div>
      </div>
    </div>
  );
}
