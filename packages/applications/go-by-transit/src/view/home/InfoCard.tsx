import { Card, CardBody, CardHeader } from "@wintermuted/ui-theme/react";
import React from "react";
import FontAwesome from "react-fontawesome";

export function InfoCard() {
  return (
    <Card>
      <CardHeader as="h5">
        <FontAwesome name="circle-info" />
        Welcome to Trimet Arrivals
      </CardHeader>
      <CardBody style={{ fontSize: "1.25rem" }}>
        Trimet Arrivals is a web service that can be used to get useful
        information about the state of the Trimet Transit Service.
      </CardBody>
    </Card>
  );
}
