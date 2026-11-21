import { Badge } from "@wintermuted/ui-theme/react";
import FontAwesome from "react-fontawesome";

interface Props {
  routeId: number;
  routeLabel?: string;
  verbose?: boolean;
}

export default function RouteIndicator({ routeId, routeLabel, verbose }: Props) {
  if (routeLabel) {
    return (
      <Badge tone="neutral">
        <FontAwesome name="train" />
        <span className="route-indicator-text">{routeLabel}</span>
      </Badge>
    );
  }
  if (!routeId) return <>{routeId || "-"}</>;
  return (
    <Badge tone="neutral">
      <FontAwesome name="bus" />
      <span>{routeId} {verbose && "Bus"}</span>
    </Badge>
  );
}
