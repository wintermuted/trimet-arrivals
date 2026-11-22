import React from "react";
import { Link } from "react-router-dom";
import { AllAlertsCard as SharedAllAlertsCard, type AllAlertsCardProps } from "@overworld/ui/alerts";
import Loading from "../loading/Loading";

export default function AllAlertsCard(props: Omit<AllAlertsCardProps, "loadingContent" | "renderStopLink" | "renderRouteLink">) {
  return <SharedAllAlertsCard {...props} loadingContent={<Loading />}
    renderStopLink={id => <Link to={`/stop/${id}`}>{id}</Link>}
    renderRouteLink={id => <Link to={`/lines/${id}`}>{id}</Link>}
  />;
}
