import React from "react";
import { SystemAlertsCard as SharedSystemAlertsCard, type SystemAlertsCardProps } from "@overworld/ui/alerts";
import Loading from "../loading/Loading";

export function SystemAlertsCard(props: Omit<SystemAlertsCardProps, "loadingContent">) {
  return <SharedSystemAlertsCard {...props} loadingContent={<Loading />} />;
}
