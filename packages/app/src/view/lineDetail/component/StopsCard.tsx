import { Card, CardBody, CardHeader } from "@wintermuted/ui-theme/react";
import React from "react";
import { Alert } from "../../../api/trimet/interfaces/alertsData";
import { TrimetRoute } from "../../../api/trimet/interfaces/routes";
import LineDetailViewStops from "./LineDetailViewStops";

interface StopsCardParams {
  route: TrimetRoute;
  alertsData: Alert[];
}

export function StopsCard({ route, alertsData }: StopsCardParams) {
  return (
    <Card>
      <CardHeader as="h5">Stops</CardHeader>
      <CardBody>
        <LineDetailViewStops route={route} alertsData={alertsData} />
      </CardBody>
    </Card>
  );
}
