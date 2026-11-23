import { Button } from "@wintermuted/ui-react";
import _ from "lodash";
import React from "react";
import { getAlertsForRoute } from "../../../api/trimet/alertScopes";
import { Alert } from "../../../api/trimet/interfaces/alertsData";
import "./NearbyRouteDetail.scss";

interface Props {
  id: number;
  alerts: Alert[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

export default class RouteAlerts extends React.Component<Props> {
  public render() {
    const { id, alerts, loading, error, onRetry } = this.props;
    const scopedAlerts = getAlertsForRoute(alerts || [], id);

    if (loading && !alerts) {
      return <p role="status">Loading route alerts...</p>;
    }

    return (
      <div className="route-alerts-wrapper">
        <h3>Route {id} alerts</h3>
        <Button type="button" size="sm" onClick={onRetry} disabled={loading}>
          {loading ? "Refreshing..." : error ? "Try again" : "Refresh"}
        </Button>
        {error && (
          <p role="alert">
            {alerts
              ? "Could not refresh alerts. Showing the last received alerts."
              : "Could not load alerts for this route. Try again."}
          </p>
        )}
        {scopedAlerts.length ? (
          <ul>
            {_.map(scopedAlerts, alert => (
              <li key={alert.id}>{alert.desc || alert.header_text}</li>
            ))}
          </ul>
        ) : !loading && !error ? (
          <p role="status">No active alerts for this route.</p>
        ) : null}
      </div>
    );
  }
}
