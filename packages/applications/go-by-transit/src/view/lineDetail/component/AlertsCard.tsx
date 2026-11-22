import React from "react";
import { StopAlertsCard, type StopAlertsCardProps } from "@overworld/ui/alerts";
import { getAlertsForStop } from "../../../api/trimet/alertScopes";
import RouteIndicator from "../../../component/route/RouteIndicator";
import Loading from "../../loading/Loading";

type Props = Omit<StopAlertsCardProps, "loadingContent" | "renderRouteIndicator"> & { stopId: number };

export function AlertsCard({ alertsData, stopId, ...props }: Props) {
  return <StopAlertsCard {...props}
    alertsData={alertsData === undefined ? undefined : getAlertsForStop(alertsData, stopId)}
    loadingContent={<Loading />}
    renderRouteIndicator={id => <RouteIndicator routeId={id} />}
  />;
}
