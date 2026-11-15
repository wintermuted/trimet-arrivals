import { Alert, Card, CardHeader } from "@wintermuted/ui-theme/react";
import { isEmpty } from "lodash";
import React from "react";
import FontAwesome from "react-fontawesome";
import { Alert as IAlert } from "../../api/trimet/interfaces/alertsData";
import Loading from "../loading/Loading";

interface Props {
  systemAlertsData: IAlert[];
}

function getSystemAlerts(systemAlertsData: IAlert[]) {
  if (isEmpty(systemAlertsData)) {
    return <Loading />;
  }

  return systemAlertsData.map(alert => {
    return (
      <Alert key={alert.id} tone="warning">
        <h3>{alert.header_text}</h3>
        <p style={{ marginBottom: 0 }}>
          <a href={alert.info_link_url}>More Info</a>
        </p>
      </Alert>
    );
  });

  // <ListGroup className="list-group-flush">
  //   {systemAlertsData &&
  //     systemAlertsData.map(alert => {
  //       return (
  //         <ListGroupItem key={alert.id}>
  //           <small>
  //             {alert.header_text} - {alert.desc}
  //           </small>
  //         </ListGroupItem>
  //       );
  //     })}
  // </ListGroup>
}

export function SystemAlertsCard({ systemAlertsData }: Props) {
  return (
    <Card>
      <CardHeader as="h5">
        <FontAwesome name="bell" />
        System Alerts
      </CardHeader>
      {getSystemAlerts(systemAlertsData)}
    </Card>
  );
}
