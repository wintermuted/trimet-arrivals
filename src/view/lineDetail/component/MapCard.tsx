import {
  Card,
  CardBody,
  CardHeader,
  CardText
} from "@wintermuted/ui-theme/react";
import React from "react";
export function MapCard() {
  return (
    <Card>
      <CardHeader as="h5">Map</CardHeader>
      <CardBody>
        <CardText>
          <p>Map goes here</p>
        </CardText>
      </CardBody>
    </Card>
  );
}
