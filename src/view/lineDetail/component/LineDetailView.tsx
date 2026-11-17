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

  useEffect(() => {
    getRouteById(id).then((results: RouteDataResultSet) => {
      setRouteData(results.route[0]);
    });

    getAlertsByRouteId(id).then((result: AlertsData) => {
      setAlertsData(result.alert);
    });
  }, []);

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
