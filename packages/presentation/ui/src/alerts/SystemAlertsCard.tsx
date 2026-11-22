import { Alert, Button, Card, CardBody, CardHeader } from "@wintermuted/ui-theme/react";
import React from "react";
import FontAwesome from "react-fontawesome";
import type { Alert as IAlert } from "@overworld/trimet-client";
import type { AlertFeedState } from "./types";

export interface SystemAlertsCardProps extends AlertFeedState {
  systemAlertsData: IAlert[] | undefined;
}

function getSystemAlerts({ systemAlertsData, loading, error, onRefresh, loadingContent }: SystemAlertsCardProps) {
  if (loading && !systemAlertsData) {
    return loadingContent;
  }

  return (
    <>
      {error && (
        <p role="alert">
          {systemAlertsData
            ? "Could not refresh system alerts. Showing the last received alerts."
            : "Could not load system alerts. Try again."}
        </p>
      )}
      {systemAlertsData?.length ? systemAlertsData.map(alert => (
        <Alert key={alert.id} tone="warning">
          <h3>{alert.header_text}</h3>
          {alert.desc && <p>{alert.desc}</p>}
          {alert.info_link_url && (
            <p style={{ marginBottom: 0 }}>
              <a href={alert.info_link_url}>More Info</a>
            </p>
          )}
        </Alert>
      )) : !error ? <p role="status">No system alerts right now.</p> : null}
      <Button type="button" size="sm" onClick={onRefresh} disabled={loading}>
        {loading ? "Refreshing..." : error ? "Try again" : "Refresh"}
      </Button>
    </>
  );
}

export function SystemAlertsCard(props: SystemAlertsCardProps) {
  return (
    <Card>
      <CardHeader as="h5">
        <FontAwesome name="bell" />
        System Alerts
      </CardHeader>
      <CardBody>{getSystemAlerts(props)}</CardBody>
    </Card>
  );
}
